import { Paragraph } from "@contentful/f36-components";
import { FieldAppSDK } from "@contentful/app-sdk";
import { /* useCMA, */ useSDK } from "@contentful/react-apps-toolkit";
import NavigationLinks from "../components/NavigationLinks";
import OpeningHours from "../components/OpeningHours";

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();

  if (sdk.contentType.sys.id === "navigation") {
    return <NavigationLinks sdk={sdk} />;
  }
  if (sdk.contentType.sys.id === "generalInfo") {
    if (sdk.field.id === "openingHours") {
      return <OpeningHours sdk={sdk} />;
    }
  }

  return <Paragraph>Von QZK App nicht unterstützt!</Paragraph>;
};

export default Field;
