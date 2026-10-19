import {contextBridge, ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('gank', Object.freeze({protocol:(request:unknown):Promise<unknown>=>ipcRenderer.invoke('gank:protocol',request)}));
