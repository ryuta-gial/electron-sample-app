import { app, BrowserWindow } from 'electron'
import installExtension, {
    REACT_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS,
} from 'electron-devtools-installer'
import dotenv from 'dotenv'
dotenv.config()
import expressApp from '../server/app'
import path from 'path'

async function createWindow(): Promise<void> {
    const mainWindow = new BrowserWindow({
        height: 500,
        width: 700,
        webPreferences: {
            worldSafeExecuteJavaScript: true,
            nodeIntegration: false,
            nodeIntegrationInWorker: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    })
    await mainWindow.loadFile('dist/index.html')
    //開発時にはデベロッパーツールを開く
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
    mainWindow.removeMenu()
    expressApp()
}
app.whenReady().then(async () => {
    if (process.env.NODE_ENV === 'development') {
        await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS], {
            loadExtensionOptions: { allowFileAccess: true },
            forceDownload: false,
        })
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err))
    }
    await createWindow()
})
app.once('window-all-closed', () => app.quit())
