import * as vscode from "vscode";
import { Node } from "../model/interface/node";
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import { DbTreeDataProvider } from "../provider/treeDataProvider";
import { DatabaseCache } from "./common/databaseCache";

export class File {
  public static async uploadFile(
      connectionNode: Node
    ): Promise<void> {
    if (!connectionNode) {
      vscode.window.showErrorMessage("Not active database connection found!");
      return;
    }
    
    // Prompt the user to upload a file 
    const fileUri = await vscode.window.showOpenDialog({
      title: 'Select a file to upload',
      openLabel: 'Upload',
      canSelectMany: false,
      filters: {
        'Supported Files': ['csv', 'xlsx', 'xls', 'sheet', 'json', 'parquet', 'pdf', 'txt']
      }
    });

    if (fileUri && fileUri.length > 0) {
      const fileName = await vscode.window.showInputBox({
        prompt: "Enter File table name without spaces",
        placeHolder: "Table name",
        validateInput: (input) => {
          const tableNamePattern = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
          const reservedKeywords = new Set([
            'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'TABLE',
            // Add other SQL reserved keywords based on your database
          ]);
          if (!tableNamePattern.test(input) || reservedKeywords.has(input.toUpperCase())) {
            return 'Invalid Table name';
          }
          return null;  // Input is valid
        }
      });

      if (File.loginToApi(connectionNode)) {
        if (File.fileUploadToApi(connectionNode,fileUri,fileName)) {
          vscode.window.showInformationMessage('File uploaded successfully!');
          // Refresh explorer
          DatabaseCache.clearCache()
          DbTreeDataProvider.refresh()
        } else {
          vscode.window.showErrorMessage('Error uploading file to Data Server');
        }
      } else {
        vscode.window.showErrorMessage('Error logging in to Data Server');
      }
    } else {
      vscode.window.showErrorMessage('No file selected');
    }
    return;
  }

  private static async fileUploadToApi(connectionNode: Node, fileUri: vscode.Uri[], fileName: String): Promise<Boolean> {
    axios.defaults.withCredentials = true;
    // Create a new form-data instance
    const localFilePath = fileUri[0].fsPath;
    const formData = new FormData();
    formData.append('file', fs.createReadStream(localFilePath));
    formData.append('original_file_name', fileName);
    
    // Define the remote server's HTTP PUT URL
    var uploadUrl = File.getApiHost(connectionNode)+`/api/files/${fileName}`;

    try {
      // Make an HTTP PUT request to upload the file
      const response = await axios.put(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),  // Include the correct multipart/form-data headers with boundary
        }
      })
      if (response.status === 200 || response.status === 201) {
        return true;
      }
    } catch (err) {
      vscode.window.showErrorMessage('Error in file upload: ',err)
    }
    return false;
  }

  private static async loginToApi(connectionNode: Node): Promise<Boolean> {
    axios.defaults.withCredentials = true;
    var statusUrl = File.getApiHost(connectionNode)+'/api/status';
    try {
      var response = await axios.get(statusUrl)
      if (response.status !== 200 || (response.data.auth.http_auth_enabled === true && response.data.auth.confirmed === false)) {
        var loginUrl = File.getApiHost(connectionNode)+'/api/login';
        var data = {
          'username': `${connectionNode.user}`,
          'password': `${connectionNode.password}`
        }
        var loginResponse = await axios.post(loginUrl, data)
        if (loginResponse.status === 200) {
          var statusResponse = await axios.get(statusUrl)
          if (statusResponse.status === 200 && response.data.auth.http_auth_enabled === true && response.data.auth.confirmed === true) {
            return true;
          }
        }
      } else {
        return true;
      }
    } catch (err) {
      vscode.window.showErrorMessage('Error in login: ',err)
    }
    return false;
  }

  private static getApiHost(connectionNode: Node): String {
    var host = `http://localhost:47334`;
    if (connectionNode.host != '127.0.0.1' && connectionNode.host != 'localhost') {
      host = `https://${connectionNode.host}`;
    }
    return host;
  }
}
