"use strict";

import * as vscode from "vscode";
import { CodeCommand } from "./common/constants";
import { ConnectionNode } from "./model/database/connectionNode";
import { SchemaNode } from "./model/database/schemaNode";
import { UserGroup } from "./model/database/userGroup";
import { CopyAble } from "./model/interface/copyAble";
import { FunctionNode } from "./model/main/function";
import { FunctionGroup } from "./model/main/functionGroup";
import { ProcedureNode } from "./model/main/procedure";
import { ProcedureGroup } from "./model/main/procedureGroup";
import { TableGroup } from "./model/main/tableGroup";
import { TableNode } from "./model/main/tableNode";
import { TriggerNode } from "./model/main/trigger";
import { TriggerGroup } from "./model/main/triggerGroup";
import { ViewGroup } from "./model/main/viewGroup";
import { ViewNode } from "./model/main/viewNode";
import { ColumnNode } from "./model/other/columnNode";
import { Console } from "./common/Console";
// Don't change last order, it will occur circular reference
import { ServiceManager } from "./service/serviceManager";
import { QueryUnit } from "./service/queryUnit";
import { FileManager } from "./common/filesManager";
import { ConnectionManager } from "./service/connectionManager";
import { QueryNode } from "./model/query/queryNode";
import { QueryGroup } from "./model/query/queryGroup";
import { Node } from "./model/interface/node";
import { DbTreeDataProvider } from "./provider/treeDataProvider";
import { UserNode } from "./model/database/userNode";
import { EsConnectionNode } from "./model/es/model/esConnectionNode";
import { ESIndexNode } from "./model/es/model/esIndexNode";
import { activeEs } from "./model/es/provider/main";
import { RedisConnectionNode } from "./model/redis/redisConnectionNode";
import KeyNode from "./model/redis/keyNode";
import { DiffService } from "./service/diff/diffService";
import { DatabaseCache } from "./service/common/databaseCache";
import { FileNode } from "./model/ssh/fileNode";
import { SSHConnectionNode } from "./model/ssh/sshConnectionNode";
import { FTPFileNode } from "./model/ftp/ftpFileNode";
import { HistoryNode } from "./provider/history/historyNode";
import { ConnectService } from "./service/connect/connectService";

export function activate(context: vscode.ExtensionContext) {

    const serviceManager = new ServiceManager(context)

    activeEs(context)

    ConnectionNode.init()
    context.subscriptions.push(
        ...serviceManager.init(),
        vscode.window.onDidChangeActiveTextEditor(detectActive),
        ConnectService.listenConfig(),
        ...initCommand({
            // util
            ...{
                [CodeCommand.Refresh]: async (node: Node) => {
                    if (node) {
                        await node.getChildren(true)
                    } else {
                        DatabaseCache.clearCache()
                    }
                    DbTreeDataProvider.refresh(node)
                },
                [CodeCommand.RecordHistory]: (sql: string, costTime: number) => {
                    serviceManager.historyService.recordHistory(sql, costTime);
                },
                "mysql.history.open": () => serviceManager.historyService.showHistory(),
                "mysql.server.info": (connectionNode: ConnectionNode) => {
                    serviceManager.statusService.show(connectionNode)
                },
                "mysql.name.copy": (copyAble: CopyAble) => {
                    copyAble.copyName();
                },
            },
            // connection
            ...{
                "mysql.connection.add": () => {
                    serviceManager.connectService.openConnect(serviceManager.provider)
                },
                "mysql.connection.edit": (connectionNode: ConnectionNode) => {
                    serviceManager.connectService.openConnect(connectionNode.provider, connectionNode)
                },
                "mysql.connection.open": (connectionNode: ConnectionNode) => {
                    connectionNode.provider.openConnection(connectionNode)
                },
                "mysql.connection.disable": (connectionNode: ConnectionNode) => {
                    connectionNode.provider.disableConnection(connectionNode)
                },
                "mysql.connection.delete": (connectionNode: ConnectionNode) => {
                    connectionNode.deleteConnection(context);
                },
                "mysql.host.copy": (connectionNode: ConnectionNode) => {
                    connectionNode.copyName();
                },
            },
            // externel data
            ...{
                "mysql.struct.diff": () => {
                    new DiffService().startDiff(serviceManager.provider);
                }
            },
            // ssh
            ...{
                'mysql.ssh.folder.new': (parentNode: SSHConnectionNode) => parentNode.newFolder(),
                'mysql.ssh.file.new': (parentNode: SSHConnectionNode) => parentNode.newFile(),
                'mysql.ssh.host.copy': (parentNode: SSHConnectionNode) => parentNode.copyIP(),
                'mysql.ssh.forward.port': (parentNode: SSHConnectionNode) => parentNode.fowardPort(),
                'mysql.ssh.file.upload': (parentNode: SSHConnectionNode) => parentNode.upload(),
                'mysql.ssh.folder.open': (parentNode: SSHConnectionNode) => parentNode.openInTeriminal(),
                'mysql.ssh.path.copy': (node: Node) => node.copyName(),
                'mysql.ssh.socks.port': (parentNode: SSHConnectionNode) => parentNode.startSocksProxy(),
                'mysql.ssh.file.delete': (fileNode: FileNode | SSHConnectionNode) => fileNode.delete(),
                'mysql.ssh.file.open': (fileNode: FileNode | FTPFileNode) => fileNode.open(),
                'mysql.ssh.file.download': (fileNode: FileNode) => fileNode.download(),
            },
            // database
            ...{
                "mysql.db.active": () => {
                    serviceManager.provider.activeDb();
                },
                "mysql.database.add": async(connectionNode: ConnectionNode) => {
                    await connectionNode.createDatabase();
                },
                "mysql.db.drop": (databaseNode: SchemaNode) => {
                    databaseNode.dropDatatabase();
                }
            },
            // user node
            ...{
                "mysql.user.sql": (userNode: UserNode) => {
                    userNode.selectSqlTemplate();
                },
            },
            // history
            ...{
                "mysql.history.view": (historyNode: HistoryNode) => {
                    historyNode.view()
                }
            },
            // query node
            ...{
                "mysql.runQuery": (sql:string) => {
                    if (typeof sql != 'string') { sql = null; }
                    QueryUnit.runQuery(sql, ConnectionManager.tryGetConnection());
                },
                "mysql.runAllQuery": () => {
                    QueryUnit.runQuery(null, ConnectionManager.tryGetConnection(), { runAll: true });
                },
                "mysql.query.switch": async (databaseOrConnectionNode: SchemaNode | ConnectionNode | EsConnectionNode | ESIndexNode) => {
                    if (databaseOrConnectionNode) {
                        await databaseOrConnectionNode.newQuery();
                    } else {
                        vscode.workspace.openTextDocument({ language: 'sql' }).then(async (doc) => {
                            vscode.window.showTextDocument(doc)
                        });
                    }
                }
            },
            // table node
            ...{
                "mysql.show.esIndex": (indexNode: ESIndexNode) => {
                    indexNode.viewData()
                }
            },
            // column node
            ...{
                "mysql.column.up": (columnNode: ColumnNode) => {
                    columnNode.moveUp();
                },
                "mysql.column.down": (columnNode: ColumnNode) => {
                    columnNode.moveDown();
                },
                "mysql.column.update": (columnNode: ColumnNode) => {
                    columnNode.updateColumnTemplate();
                },
            },
            // template
            ...{
                "mysql.table.find": (tableNode: TableNode) => {
                    tableNode.openTable();
                },
                "mysql.table.drop": (tableNode: TableNode) => {
                    tableNode.dropTable();
                },
                "mysql.codeLens.run": (sql: string) => {
                    QueryUnit.runQuery(sql, ConnectionManager.tryGetConnection(), { split: true, recordHistory: true })
                },
                "mysql.codeLens.namedQuery": (sql: string) => {
                    vscode.window.showErrorMessage('This command is not yet implemented.');
                }
            },
            // show source
            ...{
                "mysql.show.procedure": (procedureNode: ProcedureNode) => {
                    procedureNode.showSource();
                },
                "mysql.show.function": (functionNode: FunctionNode) => {
                    functionNode.showSource();
                },
                "mysql.show.trigger": (triggerNode: TriggerNode) => {
                    triggerNode.showSource();
                },
            },
            // create template
            ...{
                "mysql.template.table": (tableGroup: TableGroup) => {
                    tableGroup.createTemplate();
                }
            }
        }),
    );

}

export function deactivate() {
}

function detectActive(): void {
    const fileNode = ConnectionManager.getByActiveFile();
    if (fileNode) {
        ConnectionManager.changeActive(fileNode);
    }
}

function commandWrapper(commandDefinition: any, command: string): (...args: any[]) => any {
    return (...args: any[]) => {
        try {
            commandDefinition[command](...args);
        }catch (err) {
            Console.log(err);
        }
    };
}

function initCommand(commandDefinition: any): vscode.Disposable[] {

    const dispose = []

    for (const command in commandDefinition) {
        if (commandDefinition.hasOwnProperty(command)) {
            dispose.push(vscode.commands.registerCommand(command, commandWrapper(commandDefinition, command)))
        }
    }

    return dispose;
}


// refrences
// - when : https://code.visualstudio.com/docs/getstarted/keybindings#_when-clause-contexts