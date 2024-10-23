function configurationParameterWithFilledInDefaults({name, kind = "string", sensitive = false, optional = false}) {
	return {
		name,
		kind,
		sensitive,
		optional,
	};
}

const SupportedDataSourcesConfigurationParametersSpec = {
  postgres : [
    {
      name: "Host",
    },
    {
      name: "Database",
    },
    {
      name: "Port",
      kind: "integer",
    },
    {
      name: "User",
    },
    {
      name: "Password",
      sensitive: true,
    }
  ],
  snowflake: [
    {
      name: "Account",
    },
    {
      name: "User",
    },
    {
      name: "Password",
      sensitive: true,
    },
    {
      name: "Database",
    },
    {
      name: "Warehouse",
      optional: true,
    },
    {
      name: "Schema",
      optional: true,
    },
    {
      name: "Role",
      optional: true,
    }
  ],
  redshift: [
    {
      name: "Host",
    },
    {
      name: "Database",
    },
    {
      name: "Port",
      kind: "integer",
    },
    {
      name: "User",
    },
    {
      name: "Password",
      sensitive: true,
    }
  ],
};

export function supportedDataSourceEngines()  {
	return Object.keys(SupportedDataSourcesConfigurationParametersSpec);
}

export function dataSourceConfigurationParameterSpecForEngine(engine) {
	return SupportedDataSourcesConfigurationParametersSpec[engine].map((cpm) => (configurationParameterWithFilledInDefaults(cpm)));
}