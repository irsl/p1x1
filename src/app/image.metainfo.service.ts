import { Injectable } from '@angular/core';

import * as EXIF from 'exif-js';

import { Helper } from './helper';
import { StringKeyValuePairs } from './catalog.common';


@Injectable({
  providedIn: 'root'
})
export class ImageMetaInfoService {

    private ReadExifTagsFromImage(file: ArrayBuffer)
    {
        return EXIF.readFromBinaryFile(file);
    }

    public ReadMetaInfoFromImage(file: ArrayBuffer, prefixTags: boolean = true) : StringKeyValuePairs
    {
        var exifTags = {};
        try {
            exifTags = ImageMetaInfoService.prefixTags(this.ReadExifTagsFromImage(file), "exif", prefixTags);
        }
        catch(e) {
            console.error("Unable to parse EXIF tags", e);
        }

        // object spread
        var tags = {...exifTags};

        // filtering
        var re = {};
        Object.keys(tags).forEach(keyName=>{
            var type = typeof(tags[keyName]);
            var rawValue = tags[keyName];
            // console.log(keyName, type, rawValue);
            if((type == "object")&&(!Helper.isNumber(rawValue)))
               return;

            var value = tags[keyName].toString().trim();
            if(!value) return;

            re[keyName] = value;
        })
        return re;
    }
    static prefixTags(tags: object, prefix: string, doPrefixTags: boolean): {} {
        if(!doPrefixTags) return tags;
        var clone = {};
        for(let q of Object.keys(tags)){
            var v = tags[q];
            clone[prefix+"."+q] = v;
        }
        return clone;
    }

}
