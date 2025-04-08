import { FieldAppSDK } from "@contentful/app-sdk";
import { useEffect, useState } from "react";

interface Props {
  sdk: FieldAppSDK;
}

interface IDateRange {
  from?: string;
  to?: string;
}

interface SpecialOpeningHours {
  date: string;
  hours: IDateRange[];
}

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface IOpeningHours {
  regular: Record<Weekday, IDateRange[]>;
  special: SpecialOpeningHours[];
}

const defaultValue: IOpeningHours = {
  regular: {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  },
  special: [],
};

const weekdays = {
  Montag: "mon",
  Dienstag: "tue",
  Mittwoch: "wed",
  Donnerstag: "thu",
  Freitag: "fri",
  Samstag: "sat",
  Sonntag: "sun",
} as const;

const OpeningHours = ({ sdk }: Props) => {
  useEffect(() => {
    setTimeout(() => sdk.window.updateHeight());
  }, []);

  const [field, setField] = useState(() => (sdk.field.getValue() ?? defaultValue) as IOpeningHours);

  function setRegular(weekday: Weekday, ranges: IDateRange[]) {
    const copy: IOpeningHours = { ...field, regular: { ...field.regular, [weekday]: ranges } };
    setField(copy);
    sdk.field.setValue(sanitize(copy));
    setTimeout(() => sdk.window.updateHeight());
  }

  function setSpecial(date: string, ranges: IDateRange[]) {
    const copy: IOpeningHours = { ...field, special: [...field.special] };
    const index = copy.special.findIndex((s) => s.date === date);
    if (index === -1) {
      copy.special.push({ date, hours: ranges });
      const { compare } = new Intl.Collator("en-US");
      copy.special.sort((s1, s2) => compare(s1.date, s2.date));
    } else {
      copy.special[index] = { date, hours: ranges };
    }
    setField(copy);
    sdk.field.setValue(sanitize(copy));
    setTimeout(() => sdk.window.updateHeight());
  }

  function removeSpecial(date: string) {
    const copy: IOpeningHours = { ...field, special: [...field.special] };
    const index = copy.special.findIndex((s) => s.date === date);
    if (index !== -1) {
      copy.special.splice(index, 1);
    }
    setField(copy);
    sdk.field.setValue(sanitize(copy));
    setTimeout(() => sdk.window.updateHeight());
  }

  return (
    <div className="field-opening-hours">
      <p style={{ marginBottom: "16px" }}>🚧 Dieser Editor ist noch experimentell!</p>
      <table>
        <colgroup>
          <col style={{ width: 100 }} />
        </colgroup>
        <tbody>
          {Object.entries(weekdays).map(([label, key]) => (
            <tr key={key}>
              <td>{label}</td>
              <td>
                {field.regular[key].map((range, index) => (
                  <DateRange
                    key={index}
                    ranges={field.regular[key]}
                    index={index}
                    onChange={(ranges) => setRegular(key, ranges)}
                  />
                ))}
                <button
                  className="add-button"
                  type="button"
                  onClick={() => setRegular(key, [...field.regular[key], {}])}
                >
                  +
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ margin: "10px 0", fontWeight: 500 }}>Spezielle Öffnungszeiten</p>
      <table>
        <colgroup>
          <col style={{ width: 100 }} />
        </colgroup>
        <tbody>
          {field.special.map(({ date, hours }) => (
            <tr key={date}>
              <td>{new Date(date).toLocaleDateString()}</td>
              <td>
                {hours.length === 0 && <i style={{ marginRight: "1rem" }}>geschlossen</i>}
                {hours.map((_, index) => (
                  <DateRange
                    key={index}
                    ranges={hours}
                    index={index}
                    onChange={(ranges) => setSpecial(date, ranges)}
                  />
                ))}
                <button
                  className="add-button"
                  type="button"
                  onClick={() => setSpecial(date, [...hours, {}])}
                >
                  +
                </button>
                {hours.length === 0 && (
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => removeSpecial(date)}
                  >
                    Löschen
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        Tag hinzufügen:{" "}
        <input
          type="date"
          value=""
          onInput={(e) => {
            setSpecial(new Date(e.currentTarget.value).toISOString(), []);
          }}
        />
      </p>
    </div>
  );
};

interface DateRangeProps {
  ranges: IDateRange[];
  index: number;
  onChange: (ranges: IDateRange[]) => void;
}

function DateRange({ ranges, index, onChange }: DateRangeProps) {
  const range = ranges[index];
  const invalid = !range.from || !range.to;

  return (
    <div className={`time-range ${invalid ? "invalid" : ""}`}>
      <input
        className="time-input"
        type="time"
        value={range.from ?? ""}
        onInput={(e) => {
          const copy = [...ranges];
          copy[index].from = e.currentTarget.value;
          onChange(copy);
        }}
      />
      bis
      <input
        className="time-input"
        type="time"
        value={range.to ?? ""}
        onInput={(e) => {
          const copy = [...ranges];
          copy[index].to = e.currentTarget.value;
          onChange(copy);
        }}
      />
      <button
        className="time-delete-button"
        type="button"
        onClick={() => {
          const copy = [...ranges];
          copy.splice(index, 1);
          onChange(copy);
        }}
      >
        ×
      </button>
    </div>
  );
}

function sanitize(openingHours: IOpeningHours): IOpeningHours {
  const copy = structuredClone(openingHours);
  for (const [key, value] of Object.entries(copy.regular)) {
    copy.regular[key as Weekday] = value.filter((r) => r.from && r.to);
  }
  for (const special of copy.special) {
    special.hours = special.hours.filter((r) => r.from && r.to);
  }
  return copy;
}

export default OpeningHours;
