import { Injectable } from '@angular/core';

declare var JSZip: any;

export class PixiJsZip {

    public static CreateNewJsZip() {
      return new JSZip();
    }
    public static async TestZip() : Promise<Blob>
    {
        var zip = this.CreateNewJsZip();
        zip.file("Hello.txt", "Hello World\n");
        var content = await zip.generateAsync({type:"blob"})
        return content;
    }
}
