export type ConfigurationParameterKind = "string" | "integer" | "boolean";

export interface ConfigurationParameterMinimal {
  readonly name: string;
  readonly kind?: ConfigurationParameterKind;
  readonly sensitive?: boolean;
  readonly optional?: boolean;
}

export interface ConfigurationParameter {
	readonly name: string;
	readonly kind: ConfigurationParameterKind;
	readonly sensitive: boolean;
	readonly optional: boolean;
}

export type DataSourcesConfigurationParametersSpec = {
  [key: string]: ConfigurationParameterMinimal[];
};

export type ConfigurationParameterType = string | number | boolean;