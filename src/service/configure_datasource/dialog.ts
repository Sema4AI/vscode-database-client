import * as vscode from "vscode";
import { ConfigurationParameterKind, ConfigurationParameter, ConfigurationParameterType } from "./common";
import { supportedDataSourceEngines, dataSourceConfigurationParameterSpecForEngine } from "./supportedSources";

interface State {
    engine: string;
    name: string;
	connectionParametersSpec: ConfigurationParameter[];
    connectionParameters: Record<string, string>;
    totalSteps: number;
}

type ConnectionParametersTyped = {
	[key in string]: ConfigurationParameterType;
}

function generate_query(s: State): string {
	const connectionParametersTyped: ConnectionParametersTyped = {};
    // check if all required parameters are present
    for (const parameter of s.connectionParametersSpec) {
        if (!parameter.optional) {
            if (!s.connectionParameters[parameter.name]) {
                return '';
            }
        }
    }
	for (const [param, value] of Object.entries(s.connectionParameters)) {
		let valueTyped: ConfigurationParameterType;
		const c = s.connectionParametersSpec.find((ps) => ps.name === param)!;
		if (c.kind === "integer") {
			valueTyped = Number(value);
		} else if (c.kind === "boolean") {
			valueTyped = (value === "true") ? true : false;
		} else {
			valueTyped = value;
		}
		connectionParametersTyped[param] = valueTyped;
	}
	const query: string = `CREATE DATABASE ${s.name} WITH ENGINE = '${s.engine}', PARAMETERS = ${JSON.stringify(connectionParametersTyped)};`;
	return query;
}

async function isInteger(input: string): Promise<string | undefined> {
	const invalidInput = isNaN(Number(input));
    if (invalidInput) {
		return "please enter an integer";
    }
	return undefined;
}

async function isBoolean(input: string): Promise<string | undefined> {
	const invalidInput = (input === "true" || input === "false") ? false : true;
	if (invalidInput) {
		return "please enter either true or false";
	}
	return undefined;
}

export async function configureDataSource() {
	const state = await collectInputs();
	if (state) {
		return generate_query(state);
	}
}

async function collectInputs(): Promise<State | undefined> {
    const state = {} as Partial<State>;
    await MultiStepInput.run(input => pickDataSourceEngine(input, state));
    return state as State;
}

async function pickDataSourceEngine(input: MultiStepInput, state: Partial<State>) {
    const engines = supportedDataSourceEngines();
    const pick = await input.showQuickPick({
        title: 'Select Datasource Engine',
        step: 1,
        totalSteps: 2,
        items: engines.map(engine => ({label: engine})),
        placeholder: 'Choose a datasource engine',
    });
	
    state.engine = pick.label;
	state.connectionParametersSpec = dataSourceConfigurationParameterSpecForEngine(state.engine);
    state.totalSteps = 2 + state.connectionParametersSpec.length;
    return (input: MultiStepInput) => inputDataSourceName(input, state);
}

async function inputDataSourceName(input: MultiStepInput, state: Partial<State>) {
    state.name = await input.showInputBox({
        title: 'Provide Datasource Name',
        step: 2,
        totalSteps: state.totalSteps!,
        value: state.name! || '',
        prompt: 'Provide a name for this datasource',
		sensitive: false,
        validate: validateNonEmpty,
    });
    state.connectionParameters = {};
    return (input: MultiStepInput) => inputConnectionParams(input, state);
}

async function inputConnectionParams(input: MultiStepInput, state: Partial<State>) {
    for (let i = 0; i < state.connectionParametersSpec!.length; i++) {
        const param = state.connectionParametersSpec![i].name;
		const paramKind = state.connectionParametersSpec![i].kind;
		let validator: (input: string) => Promise<string | undefined>;
		let defaultValue: string = '';
		if (paramKind === "string") {
			validator = validateNonEmpty;
		} else if (paramKind === "integer") {
			validator = isInteger;
			defaultValue = '0';
		} else {
			validator = isBoolean;
			defaultValue = 'false';
		}
        state.connectionParameters![param] = await input.showInputBox({
            title: `Datasource Configuration`,
            step: i + 3,
            totalSteps: state.totalSteps!,
            value: state.connectionParameters![param] || defaultValue,
            prompt: `Provide a value for ${param}`,
			sensitive: state.connectionParametersSpec![i].sensitive,
            validate: validator,
        });
    }
}

async function validateNonEmpty(name: string): Promise<string | undefined> {
    return name === '' ? 'This field is required' : undefined;
}

class InputFlowAction {
    static back = new InputFlowAction();
    static cancel = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends vscode.QuickPickItem> {
    title: string;
    step: number;
    totalSteps: number;
    items: T[];
    placeholder: string;
    activeItem?: T;
}

interface InputBoxParameters {
    title: string;
    step: number;
    totalSteps: number;
    value: string;
    prompt: string;
	sensitive: boolean;
    validate: (value: string) => Promise<string | undefined> | undefined;
}

class MultiStepInput {
    static async run<T>(start: InputStep) {
        const input = new MultiStepInput();
        return input.stepThrough(start);
    }

    private current?: vscode.QuickInput;
    private steps: InputStep[] = [];

    private async stepThrough<T>(start: InputStep) {
        let step: InputStep | void = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            } catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                } else if (err === InputFlowAction.cancel) {
                    step = undefined;
                } else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }

    async showQuickPick<T extends vscode.QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, placeholder, activeItem }: P) {
        const disposables: vscode.Disposable[] = [];
        try {
            return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = vscode.window.createQuickPick<T>();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.placeholder = placeholder;
                input.items = items;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = [vscode.QuickInputButtons.Back];
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === vscode.QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidChangeSelection(items => resolve(items[0])),
                    input.onDidHide(() => {
                        (async () => {
                            reject(InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, sensitive = false }: P) {
        const disposables: vscode.Disposable[] = [];
        try {
            return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = vscode.window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value;
                input.prompt = prompt;
                input.buttons = [vscode.QuickInputButtons.Back];
				input.password = sensitive;
                let validating = validate(value);
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === vscode.QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve(<any>item);
                        }
                    }),
                    input.onDidAccept(async () => {
                        const value = input.value;
                        input.enabled = false;
                        input.busy = true;
                        if (!(await validate(value))) {
                            resolve(value);
                        }
                        input.enabled = true;
                        input.busy = false;
                    }),
                    input.onDidChangeValue(async text => {
                        const current = validate(text);
                        validating = current;
                        const validationMessage = await current;
                        if (current === validating) {
                            input.validationMessage = validationMessage;
                        }
                    }),
                    input.onDidHide(() => {
                        (async () => {
                            reject(InputFlowAction.cancel);
                        })()
                            .catch(reject);
                    })
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}

export function deactivate() {}