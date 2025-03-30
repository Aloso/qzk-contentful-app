import { SidebarAppSDK } from "@contentful/app-sdk";
import { Note } from "@contentful/f36-components";
import { useEffect, useMemo, useState } from "react";

export interface LinkWarning {
  reason:
    | "checkEntry"
    | "checkAsset"
    | "noEntryLink"
    | "urlText"
    | "404"
    | "unpublishedEntry"
    | "unpublishedAsset";
  text: string;
  uri: string;
}

interface Props {
  linkWarnings: LinkWarning[];
  sdk: SidebarAppSDK;
}

export function LinkWarnings({ linkWarnings, sdk }: Props) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const badLinks = useMemo(() => {
    return linkWarnings.flatMap((b) => {
      const error = errors[b.uri];
      if (b.reason === "noEntryLink" || b.reason === "urlText") {
        return [b];
      } else if (b.reason === "checkAsset" && error) {
        return [
          { ...b, reason: "unpublishedAsset", text: `Asset: ${error}` } satisfies LinkWarning,
        ];
      } else if (b.reason === "checkEntry" && error) {
        return [
          { ...b, reason: "unpublishedEntry", text: `Entry: ${error}` } satisfies LinkWarning,
        ];
      } else {
        return [];
      }
    });
  }, [linkWarnings, errors]);

  useEffect(() => {
    for (const link of linkWarnings) {
      if (link.reason === "checkEntry" || link.reason === "checkAsset") {
        if (link.uri in errors) {
          continue;
        }

        setErrors((c) => ({ ...c, [link.uri]: null }));
        (async () => {
          try {
            const response = await (link.reason === "checkAsset"
              ? sdk.cma.asset.get({ assetId: link.uri })
              : sdk.cma.entry.get({ entryId: link.uri }));

            if ((response.sys.publishedCounter ?? 0) === 0) {
              const text = response.fields.title?.["de-DE"] ?? link.text;
              setErrors((c) => ({ ...c, [link.uri]: text }));
            }
          } catch (error) {
            setErrors((c) => ({ ...c, [link.uri]: link.text }));
          }
        })();
      }
    }
  }, [linkWarnings]);

  return (
    <>
      {badLinks.length > 0 && (
        <Note style={{ marginBottom: "12px" }} variant="warning" title="Warnungen zu Links">
          <ul style={{ margin: 0, paddingLeft: "15px", marginLeft: "-40px" }}>
            {badLinks.map((b) => (
              <li style={{ marginTop: 5 }}>
                {b.text}
                <br />
                <span style={{ color: "darkred" }}>
                  {b.reason === "unpublishedEntry" || b.reason === "unpublishedAsset"
                    ? "Muss noch veröffentlicht werden"
                    : b.reason === "404"
                    ? "Die Seite existiert nicht!"
                    : b.reason === "noEntryLink"
                    ? "Verwende Link type 'Entry'"
                    : b.reason === "urlText"
                    ? "Verwende einen aussagekräftigen Text!"
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </Note>
      )}
    </>
  );
}
