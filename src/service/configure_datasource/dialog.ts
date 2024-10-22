export function generate_query(configureOpts) {
    let engine = configureOpts.engine;
    let dsName = configureOpts.name;
    let confParams = configureOpts.connectionParams;
    const qry: string = `CREATE DATABASE ${dsName} WITH ENGINE = '${engine}', PARAMETERS = ${JSON.stringify(confParams)};`;
	return qry;
}

// export function deactivate() {}