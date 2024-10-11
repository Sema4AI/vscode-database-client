import { ConfigurationParameter, ConfigurationParameterKind } from "./common";

interface ConfigurationParameterMinimal {
  readonly name: string;
  readonly kind?: ConfigurationParameterKind;
  readonly sensitive?: boolean;
  readonly optional?: boolean;
}

type DataSourcesConfigurationParametersSpec = {
  [key: string]: ConfigurationParameterMinimal[];
};

function configurationParameterWithFilledInDefaults({name, kind = "string", sensitive = false, optional = false}: ConfigurationParameterMinimal): ConfigurationParameter {
	return {
		name,
		kind,
		sensitive,
		optional,
	};
}

const SupportedDataSourcesConfigurationParametersSpec: DataSourcesConfigurationParametersSpec = {
  postgres : [
    {
      name: "host",
    },
    {
      name: "port",
      kind: "integer",
    },
    {
      name: "user",
    },
    {
      name: "password",
      sensitive: true,
    }
  ],
  snowflake: [
    {
      name: "account",
    },
    {
      name: "user",
    },
    {
      name: "password",
      sensitive: true,
    },
    {
      name: "database",
    },
    {
      name: "warehouse",
      optional: true,
    },
    {
      name: "schema",
      optional: true,
    },
    {
      name: "role",
      optional: true,
    }
  ],
};

export function supportedDataSourceEngines(): string[] {
	return Object.keys(SupportedDataSourcesConfigurationParametersSpec);
}

export function dataSourceConfigurationParameterSpecForEngine(engine: string): ConfigurationParameter[] {
	return SupportedDataSourcesConfigurationParametersSpec[engine].map((cpm) => (configurationParameterWithFilledInDefaults(cpm)));
}