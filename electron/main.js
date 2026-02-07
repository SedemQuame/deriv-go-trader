const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        title: "Deriv Trader"
    });

    // Load the backend URL
    // We'll wait a bit or retry connection
    const loadURL = async () => {
        const port = process.env.PORT || '8080';
        const url = `http://localhost:${port}`;

        // Simple retry loop
        const maxRetries = 20;
        let retries = 0;

        const checkServer = () => {
            // In a real app we might use http.get to check, 
            // but browser load also works if we handle failure
            mainWindow.loadURL(url).catch(err => {
                if (retries < maxRetries) {
                    retries++;
                    setTimeout(checkServer, 500);
                } else {
                    console.error("Failed to connect to backend", err);
                }
            });
        };
        checkServer();
    };

    loadURL();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startServer() {
    let backendPath;
    let cwd;

    if (app.isPackaged) {
        // In production, binaries and resources are in the resources directory
        // process.resourcesPath points to the 'resources' folder (mac: Contents/Resources, win/linux: resources)
        cwd = process.resourcesPath;

        // Binaries are expected to be in the root of resourcesPath because of our extraResources config
        const exeName = process.platform === 'win32' ? 'webserver.exe' : 'webserver';
        backendPath = path.join(cwd, exeName);
    } else {
        // Development
        cwd = path.join(__dirname, '..'); // Root of project
        backendPath = path.join(cwd, 'webserver'); // Assumes 'go build -o webserver cmd/webserver/main.go' was run relative to root
    }

    console.log("Starting backend:", backendPath);
    console.log("CWD:", cwd);

    const env = Object.assign({}, process.env, {
        PORT: '8080' // Enforce specific port or use dynamic if we wanted
    });

    serverProcess = spawn(backendPath, [], {
        cwd: cwd,
        env: env
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Backend stdout: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Backend stderr: ${data}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            dialog.showErrorBox('Backend Error', `The backend server exited unexpectedly with code ${code}.\nPlease check the logs or your configuration.`);
            app.quit();
        }
    });
}


app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
