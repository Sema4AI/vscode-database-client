import { ConfigKey } from '@/common/constants';
import { Global } from '@/common/global';
import * as vscode from 'vscode';
import { SQLParser } from '../parser/sqlParser';
import { ConnectionManager } from '@/service/connectionManager';

export class SqlCodeLensProvider implements vscode.CodeLensProvider {


    onDidChangeCodeLenses?: vscode.Event<void>;
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        return this.parseCodeLens(document)
    }
    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        throw new Error('Method not implemented.');
    }

    public parseCodeLens(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        if (Global.getConfig<number>(ConfigKey.DISABLE_SQL_CODELEN)) {
            return []
        }

        

       
        return SQLParser.parseBlocks(document).flatMap(block => {
          // Create a CodeLens for the "Run SQL" command
          let codeLensCollection = [];
          const node = ConnectionManager.tryGetConnection();
          let dbToRun = "";
          if(node && node.host){
            dbToRun = ` on ${node.host}`;
            if(node.name){
              dbToRun = ` on ${node.name}`;
            }
            
            
            const runCommand = new vscode.CodeLens(block.range, {
                command: "mysql.codeLens.run",
                title: `▶ Run SQL${dbToRun}`,
                arguments: [block.sql],
            });
            codeLensCollection.push(runCommand);
          }
         
  
          // Create a CodeLens for the "Create Named Query" command
          const createNamedQueryCommand = new vscode.CodeLens(block.range, {
              command: "mysql.codeLens.namedQuery",
              title: "✚ Create Named Query ",
              arguments: [block.sql],
          });
          codeLensCollection.push(createNamedQueryCommand);
  
          // Return both CodeLens objects for the same block
          return codeLensCollection;
      });
    }

}