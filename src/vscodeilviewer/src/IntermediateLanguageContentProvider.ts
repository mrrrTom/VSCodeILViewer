import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';

var request = require('request');

let parsePath = () => {
    let document = vscode.window.activeTextEditor.document;
    let parsedPath = path.parse(document.fileName);
    return parsedPath;
}

export class IntermediateLanguageContentProvider implements vscode.TextDocumentContentProvider {

        public static Scheme = 'il-viewer';

        private _response;
        private _previewUri;
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

        constructor(previewUri : vscode.Uri,) {
            this._previewUri = previewUri;
        }

        // Implementation
        public provideTextDocumentContent(uri: vscode.Uri) : string {

            if (!this._response){
                // TODO: this code is a bit messy, consider a promise
                this.findProjectJson((projectJson, filename) => {
                    return this.requstIl(projectJson, filename);
                })
                
                return "Generating IL, hold onto your seat belts!";
            }

            let output = this.renderPage(this._response);
            this._response = null;

            return output;
        }

        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }

        private findProjectJson(requestIntermediateLanguage){
            const parsedPath = parsePath();
            const filename = parsedPath.name;

            vscode.workspace.findFiles("**/project.json","").then((uris) => {

                const directory = parsedPath.dir;
                uris.forEach((uri) => {
                    var projectJson = uri.fsPath;    
                    if (projectJson.includes(directory)){
                        requestIntermediateLanguage(parsedPath.name, projectJson);
                        return;
                    }
                });

            });
        }

        private renderPage(body: IInstructionResult[]) : string {
            let output = "";
            body.forEach(function(value: IInstructionResult, index: number){
                output += "<div style=\"font-size: 14px\"><pre>" + value.value + "</pre></div>";
            });

            return `
            <style type="text/css">
                .outOfDateBanner {
                    display: table;
                    background-color: red;
                }

                .outOfDateBanner span {
                    display: table-cell;
                }
            </style>
            <body>
            ${output}
            </body>`;
        }

        public requstIl(filename: string, projectJsonPath : string) {

            let postData = {
                ProjectFilePath : projectJsonPath,
                Filename : filename
            }

            let options = {
                method: 'post',
                body: postData,
                json: true,
                url: 'http://localhost:5000/api/il/'
            }

            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    this._response = body;
                    this._onDidChange.fire(this._previewUri);
                }
            });
        }
    }