import { EnvironmentSelectionOption } from "../types/dropdown-types";

export const ENVIRONMENTS: EnvironmentSelectionOption[] = [
  { label: "Local", value: "localhost", prefix: "LOC" },
  { label: "Integrations", value: "integrations", prefix: "INT" },
  { label: "Staging", value: "staging", prefix: "STAG" },
  { label: "Test", value: "test", prefix: "TEST" },
];

export default ENVIRONMENTS;
