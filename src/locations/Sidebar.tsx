import { Note } from "@contentful/f36-components";
import { SidebarAppSDK } from "@contentful/app-sdk";
import { Document, Block, Inline, Text, INLINES, BLOCKS } from "@contentful/rich-text-types";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useEffect, useMemo, useState } from "react";
import { LinkWarning, LinkWarnings } from "../components/LinkWarnings";

const Sidebar = () => {
  const sdk = useSDK<SidebarAppSDK>();
  useEffect(() => {
    sdk.window.startAutoResizer();
  }, []);

  const { fields } = sdk.entry;
  const contentField = sdk.contentType.sys.id === "person" ? fields.description : fields.content;
  const [content, setContent] = useState(contentField?.getValue() as Document);

  const { words, wrongHeadings, lineBreaks, linkWarnings, longest, headingCount } = useMemo(() => {
    const { text, wrongHeadings, linkWarnings, longest, headingCount } = getText(content);

    const words = text
      .replaceAll(" $$ ", "")
      .trim()
      .split(/[\s/,-]+/);
    const lineBreaks = getDiscouragedLineBreaks(text).map((s) => s.split(" || ", 2));
    return {
      words,
      wrongHeadings,
      lineBreaks,
      linkWarnings,
      longest,
      headingCount,
    };
  }, [content]);

  useEffect(() => {
    return contentField.onValueChanged((value) => {
      setContent(value);
    });
  }, [contentField]);

  return (
    <div className="sidebar">
      <LinkWarnings linkWarnings={linkWarnings} sdk={sdk} />
      {wrongHeadings.length > 0 && (
        <Note
          style={{ marginBottom: "12px" }}
          variant="warning"
          title="Überschriften mit ungültiger Hierarchie"
        >
          <ul style={{ margin: 0, paddingLeft: "15px", marginLeft: "-40px" }}>
            {wrongHeadings.map((h) => (
              <li>{h}</li>
            ))}
          </ul>
        </Note>
      )}
      {lineBreaks.length > 0 && (
        <Note style={{ marginBottom: "12px" }} variant="warning" title="Harte Zeilenumbrüche">
          <p style={{ margin: "0 0 10px -40px" }}>Meistens sind Absätze besser!</p>
          <ul style={{ margin: 0, paddingLeft: "15px", marginLeft: "-40px" }}>
            {lineBreaks.map(([a, b]) => (
              <li>
                {a}
                <span className="hard-br"></span>
                {b}
              </li>
            ))}
          </ul>
        </Note>
      )}
      <Note style={{ marginBottom: "12px" }}>
        <p>Inhalt: {words.length} Wörter</p>
        {longest.sentence.length > 200 && (
          <p style={{ margin: "12px 0 0 -40px" }}>
            Ein Satz ist ganze <b>{longest.sentence.length}</b> Zeichen lang:
            <br />
            <i>{longest.sentence.slice(0, 100)}...</i>
          </p>
        )}
        {longest.paragraph.length > 500 && (
          <p style={{ margin: "12px 0 0 -40px" }}>
            Ein Absatz ist <b>{longest.paragraph.length}</b> Zeichen lang! Kürzere Absätze sind
            leichter lesbar.
          </p>
        )}
        {words.length > 180 && headingCount * 120 < words.length - 120 && (
          <p style={{ margin: "12px 0 0 -40px" }}>
            Mit mehr Überschriften wird der Text wahrscheinlich barriereärmer.
          </p>
        )}
      </Note>
    </div>
  );
};

function getText(document: Document) {
  const acc: TextAcc = {
    text: "",
    lastHeading: 1,
    wrongHeadings: [],
    linkWarnings: [],
    longest: { paragraph: "", sentence: "" },
    headingCount: 0,
  };
  for (const para of document.content) {
    getTextForNode(para, acc);
  }
  return acc;
}

interface TextAcc {
  text: string;
  lastHeading: number;
  wrongHeadings: string[];
  linkWarnings: LinkWarning[];
  longest: { paragraph: string; sentence: string };
  headingCount: number;
}

function getTextForNode(node: Block | Inline | Text, acc: TextAcc) {
  if (node.nodeType === "text") {
    acc.text += node.value;
  } else {
    if (node.nodeType.startsWith("heading-")) {
      const heading = Number(node.nodeType.replace(/\D/g, ""));

      if (heading > acc.lastHeading + 1) {
        acc.lastHeading = heading;
        const accNew: TextAcc = { ...acc, text: " $$ " };
        for (const child of node.content) {
          getTextForNode(child, accNew);
        }
        acc.wrongHeadings.push(accNew.text.replaceAll(" $$ ", "").trim());
        acc.text += accNew.text;
        return;
      }
      acc.lastHeading = heading;
      acc.text += " $$ ";
      acc.headingCount += 1;
    } else if (node.nodeType === BLOCKS.PARAGRAPH) {
      const accNew: TextAcc = { ...acc, text: " $$ " };
      for (const child of node.content) {
        getTextForNode(child, accNew);
      }
      acc.text += accNew.text;

      const text = accNew.text.replaceAll(" $$ ", "").trim();
      if (text.length > acc.longest.paragraph.length) {
        acc.longest.paragraph = text;
      }
      const sentences = text.split(/[.:;?!]\s+/);
      const longest = sentences.reduce<string>((a, b) => (a.length > b.length ? a : b), "");
      if (longest.length > acc.longest.sentence.length) {
        acc.longest.sentence = longest;
      }
      return;
    } else if (node.nodeType === INLINES.HYPERLINK) {
      const accNew: TextAcc = { ...acc, text: "" };
      for (const child of node.content) {
        getTextForNode(child, accNew);
      }
      acc.text += accNew.text;

      const uri = node.data.uri as string;
      const text = accNew.text.replaceAll(" $$ ", "").trim();
      if (uri.startsWith("https://queereszentrumkassel.de")) {
        acc.linkWarnings.push({ reason: "noEntryLink", text, uri });
      } else if (/^https?::\/\//.test(text)) {
        acc.linkWarnings.push({ reason: "urlText", text, uri });
      }
      return;
    } else if (node.nodeType === INLINES.ENTRY_HYPERLINK) {
      const accNew: TextAcc = { ...acc, text: "" };
      for (const child of node.content) {
        getTextForNode(child, accNew);
      }
      acc.text += accNew.text;

      const uri = node.data.target.sys.id as string;
      const text = accNew.text.replaceAll(" $$ ", "").trim();
      acc.linkWarnings.push({ reason: "checkEntry", text, uri });
      return;
    } else if (node.nodeType === BLOCKS.EMBEDDED_ASSET) {
      const uri = node.data.target.sys.id as string;
      acc.linkWarnings.push({ reason: "checkAsset", text: `Asset ${uri}`, uri });
      return;
    } else if (
      node.nodeType !== INLINES.ASSET_HYPERLINK &&
      node.nodeType !== INLINES.EMBEDDED_ENTRY &&
      node.nodeType !== INLINES.EMBEDDED_RESOURCE &&
      node.nodeType !== INLINES.RESOURCE_HYPERLINK
    ) {
      acc.text += " $$ ";
    }

    for (const child of node.content) {
      getTextForNode(child, acc);
    }
  }
}

function getDiscouragedLineBreaks(text: string): string[] {
  const lineBreaks = [];
  for (const lb of text.matchAll(/\n/g)) {
    const before = text.slice(Math.max(0, lb.index - 50), lb.index);
    const after = text.slice(lb.index + 1, lb.index + 51);

    let isDiscouraged: boolean;
    if (before.endsWith(" $$ ") || after.startsWith(" $$ ") || after.length === 0) {
      isDiscouraged = true;
    } else if (
      (before.includes("\n") || before.includes(" $$ ")) &&
      (after.includes("\n") || after.includes(" $$ "))
    ) {
      isDiscouraged = false;
    } else {
      isDiscouraged = true;
    }

    if (isDiscouraged) {
      lineBreaks.push(`...${before.slice(-33)} || ${after.slice(0, 33)}...`.replaceAll(" $$ ", ""));
    }
  }
  return lineBreaks;
}

export default Sidebar;
