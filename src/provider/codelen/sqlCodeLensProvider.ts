import { ConfigKey } from '@/common/constants';
import { Global } from '@/common/global';
import * as vscode from 'vscode';
import { SQLParser } from '../parser/sqlParser';

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
          const runCommand = new vscode.CodeLens(block.range, {
              command: "mysql.codeLens.run",
              title: "▶ Run SQL",
              arguments: [block.sql],
          });
  
          // Create a CodeLens for the "Create Named Query" command
          const createNamedQueryCommand = new vscode.CodeLens(block.range, {
              command: "mysql.codeLens.namedQuery",
              title: "✚ Create Named Query ",
              arguments: [block.sql],
          });
  
          // Return both CodeLens objects for the same block
          return [runCommand, createNamedQueryCommand];
      });
    }

}