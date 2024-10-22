

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
      name: "host",
    },
    {
      name: "database",
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
  redshift: [
    {
      name: "host",
    },
    {
      name: "database",
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
};

export function supportedDataSourceEngines()  {
	return Object.keys(SupportedDataSourcesConfigurationParametersSpec);
}

export function dataSourceConfigurationParameterSpecForEngine(engine) {
	return SupportedDataSourcesConfigurationParametersSpec[engine].map((cpm) => (configurationParameterWithFilledInDefaults(cpm)));
}