import { Injectable } from '@angular/core';
import { Helper } from './helper';
import PixiError, {E} from "./error";

export abstract class AbstractLocalStorage {

    public abstract getRaw(key: string): any;

    public get<T>(TCreator: { new (): T; }, key: string)
    {
        var data = this.getRaw(key);
        if(!data) return null;
        if(TCreator["fromJSON"]) return TCreator["fromJSON"](data);
        return Helper.createRaw(TCreator, data);
    }

    public abstract set(key: string, value: any);

    public abstract remove(key: string);
}

export class ReadonlyLocalStorage extends AbstractLocalStorage {
    constructor(private data: any)
    {
        super();
    }

    public getRaw(key: string) {
        return this.data[key];
    }
    public set(key: string, value: any) {
        throw new PixiError(E.NotImplementedError);
    }
    public remove(key: string) {
        throw new PixiError(E.NotImplementedError);
    }

}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService extends AbstractLocalStorage {

    public getRaw(key: string)
    {
        var n = localStorage.getItem(key);
        if(!this.isDefined(n))
           return; // always returning null when a key is not found

        return JSON.parse(n);
    }

    public set(key: string, value: any)
    {
        if(!this.isDefined(value))
           return this.remove(key);

        localStorage.setItem(key, JSON.stringify(value));
    }

    public remove(key: string)
    {
        localStorage.removeItem(key);
    }

    private isDefined(v: any) : boolean
    {
        if((v === null)||(v === undefined))
           return false;
        return true;
    }
}
