import { FieldAppSDK } from "@contentful/app-sdk";
import { useEffect, useState } from "react";

interface Props {
  sdk: FieldAppSDK;
}

interface Entry {
  path: string;
  name: string;
  nameEn: string;
}

interface NestedEntry extends Entry {
  children: Entry[];
}

const NavigationLinks = ({ sdk }: Props) => {
  useEffect(() => {
    setTimeout(() => sdk.window.updateHeight());
  }, []);

  const [field, setField] = useState(() => (sdk.field.getValue() ?? []) as NestedEntry[]);

  function setFieldValue(index: number, entryNew: NestedEntry) {
    const copy = [...field];
    copy[index] = entryNew;
    if (
      copy[index].name === "" &&
      copy[index].nameEn === "" &&
      copy[index].path === "" &&
      !copy[index].children.length
    ) {
      copy.splice(index, 1);
    }
    setField(copy);
    sdk.field.setValue(copy);
    setTimeout(() => sdk.window.updateHeight());
  }

  function move(index: number, direction: "up" | "down") {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    const copy = [...field];
    const current = copy[index];
    const next = copy[nextIndex];
    copy[index] = next;
    copy[nextIndex] = current;
    setField(copy);
    sdk.field.setValue(field);
  }

  return (
    <div className="field-navigation">
      <p style={{ marginBottom: "16px" }}>🚧 Dieser Editor ist noch in Bearbeitung!</p>
      <p style={{ marginBottom: "16px" }}>Eingerückte Zeilen sind verschachtelt.</p>

      <div className="row title">
        <input type="text" value="Relative URL" readOnly disabled />
        <input type="text" value="Name" readOnly disabled />
        <input type="text" value="Englischer Name" readOnly disabled />
      </div>
      {field.map((entry, i) => (
        <Row
          key={i}
          entry={entry}
          index={i}
          lastIndex={field.length - 1}
          setEntry={(entry) => setFieldValue(i, entry)}
          up={() => move(i, "up")}
          down={() => move(i, "down")}
        />
      ))}
      <Row
        key={field.length}
        entry={{ name: "", nameEn: "", path: "", children: [] }}
        index={0}
        lastIndex={0}
        isInactive
        setEntry={(newEntry) => setFieldValue(field.length, newEntry)}
        up={() => {}}
        down={() => {}}
      />
    </div>
  );
};

interface RowProps {
  entry: NestedEntry;
  index: number;
  lastIndex: number;
  isInactive?: boolean;
  setEntry: (e: NestedEntry) => void;
  up: () => void;
  down: () => void;
}

function Row({ entry, index, lastIndex, isInactive, setEntry, up, down }: RowProps) {
  function setChild(index: number, entryNew: Entry) {
    const copy = { ...entry, children: [...entry.children] };
    copy.children[index] = entryNew;
    if (
      copy.children[index].name === "" &&
      copy.children[index].nameEn === "" &&
      copy.children[index].path === ""
    ) {
      copy.children.splice(index, 1);
    }
    setEntry(copy);
  }

  function move(index: number, direction: "up" | "down") {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    const copy = { ...entry, children: [...entry.children] };
    const current = copy.children[index];
    const next = copy.children[nextIndex];
    copy.children[index] = next;
    copy.children[nextIndex] = current;
    setEntry(copy);
  }

  return (
    <>
      <div className="row" style={{ opacity: isInactive ? 0.4 : 1 }}>
        <input
          type="text"
          value={entry.path}
          onChange={(e) => setEntry({ ...entry, path: e.currentTarget.value })}
        />
        <input
          type="text"
          value={entry.name}
          onChange={(e) => setEntry({ ...entry, name: e.currentTarget.value })}
        />
        <input
          type="text"
          value={entry.nameEn}
          onChange={(e) => setEntry({ ...entry, nameEn: e.currentTarget.value })}
        />
        <button className="move" onClick={up} disabled={index === 0}>
          ↑
        </button>
        <button className="move" onClick={down} disabled={index === lastIndex}>
          ↓
        </button>
      </div>
      {entry.children.map((nestedEntry, ii) => (
        <NestedRow
          key={ii}
          entry={nestedEntry}
          index={ii}
          lastIndex={entry.children.length - 1}
          setEntry={(entry) => setChild(ii, entry)}
          up={() => move(ii, "up")}
          down={() => move(ii, "down")}
        />
      ))}
      {!isInactive && (
        <NestedRow
          key={entry.children.length}
          entry={{ name: "", nameEn: "", path: "" }}
          index={0}
          lastIndex={0}
          isInactive
          setEntry={(newEntry) => setChild(entry.children.length, newEntry)}
          up={() => {}}
          down={() => {}}
        />
      )}
    </>
  );
}

interface NestedRowProps {
  entry: Entry;
  index: number;
  lastIndex: number;
  isInactive?: boolean;
  setEntry: (e: Entry) => void;
  up: () => void;
  down: () => void;
}

function NestedRow({ entry, index, lastIndex, isInactive, setEntry, up, down }: NestedRowProps) {
  return (
    <div className="row nested" style={{ opacity: isInactive ? 0.4 : 1 }}>
      <input
        type="text"
        value={entry.path}
        onChange={(e) => setEntry({ ...entry, path: e.currentTarget.value })}
      />
      <input
        type="text"
        value={entry.name}
        onChange={(e) => setEntry({ ...entry, name: e.currentTarget.value })}
      />
      <input
        type="text"
        value={entry.nameEn}
        onChange={(e) => setEntry({ ...entry, nameEn: e.currentTarget.value })}
      />
      <button className="move" onClick={up} disabled={index === 0}>
        ↑
      </button>
      <button className="move" onClick={down} disabled={index === lastIndex}>
        ↓
      </button>
    </div>
  );
}

export default NavigationLinks;
