import { TestBed } from '@angular/core/testing';

import { Helper, ComparisonOperator } from '../app/helper';
import { CatalogFile, CatalogCapability } from 'src/app/catalog.service';
import { TagWeightPairs, StringKeyValuePairs } from '../app/catalog.common';

describe('buffer helper functions', ()=>{
    
    it('array buffer to hex string test', () => {
      var buffer = new ArrayBuffer(4);
      var uint8 = new Uint8Array(buffer);
      uint8.set([1,2,3,4]);
      var hexStr = Helper.ArrayBufferToHexString(buffer)
      expect(hexStr).toBe("01020304");
      var abFromStr = Helper.HexStringToArrayBuffer(hexStr);
      var hexStr2 = Helper.ArrayBufferToHexString(abFromStr);
      expect(hexStr2).toBe(hexStr);
    });
  
    it('array buffer to string and vice versa', () => {
      const inStr = "whatever";
      var tmpBuf = Helper.StringToArrayBuffer(inStr);
      var strAgain = Helper.ArrayBufferToUtf8String(tmpBuf);
      expect(strAgain).toBe(inStr);
    });

});

describe('Helper', () => {
    it("enum mapper",()=>{
        var x = Helper.getEnumMap(CatalogCapability);
        expect(Object.keys(x)).toEqual(["Writeable", "CreateClearSubCatalog", "CreatePasswordProtectedSubCatalog", "CreateKeyDerivedSubCatalog", "MountCatalog", "ManagePasswords", "ShareFilesClear", "ShareFilesProtected" ]);
        expect(Object.values(x)).toEqual([
            CatalogCapability.Writeable, 
            CatalogCapability.CreateClearSubCatalog, 
            CatalogCapability.CreatePasswordProtectedSubCatalog, 
            CatalogCapability.CreateKeyDerivedSubCatalog, 
            CatalogCapability.MountCatalog, 
            CatalogCapability.ManagePasswords,  
            CatalogCapability.ShareFilesClear,  
            CatalogCapability.ShareFilesProtected,  
        ]);
    })
    it("intersect tags",()=>{
        var t1 = {"a": "b", "e": "f"};
        var t2 = {"a": "c"};
        var t3 = {"a": ""};
        var t4 = {"a": "b", "c": "d"};
        expect(Helper.intersectTags([t1])).toEqual(t1);
        expect(Helper.intersectTags([])).toEqual({});
        expect(Helper.intersectTags(null)).toEqual({});
        expect(Helper.intersectTags([t1,t2])).toEqual({});
        expect(Helper.intersectTags([t1,t3])).toEqual({});
        expect(Helper.intersectTags([t1,t4])).toEqual({"a": "b"});
    })
    it("tag classifier",()=>{
        var t = {"media.width": 1000, "something.else": "sdf"};
        var re = Helper.classifyTags(t);
        expect(re.protectedTags).toEqual({"media.width": 1000});
        expect(re.unprotectedTags).toEqual({"something.else": "sdf"});
    })
    it("content type", ()=>{
        expect(Helper.isImage("image/jpeg")).toBeTruthy();
        expect(Helper.isImage("video/mp4")).toBeFalsy();
        expect(Helper.isImage(null)).toBeFalsy();
    });
    it("compare stuffs", ()=>{
        expect(Helper.parseComparisonOperator("foobar")).toBeFalsy(false);
        expect(Helper.parseComparisonOperator(">=")).toEqual(ComparisonOperator.AtLeast);
        expect(Helper.parseComparisonOperator("<=")).toEqual(ComparisonOperator.AtMost);
        expect(Helper.parseComparisonOperator(">")).toEqual(ComparisonOperator.GreaterThan);
        expect(Helper.parseComparisonOperator("<")).toEqual(ComparisonOperator.LessThan);
        expect(Helper.parseComparisonOperator("=")).toEqual(ComparisonOperator.Equals);

        expect(Helper.compareStuff("2019-11-01", "2019-11-01", ComparisonOperator.AtLeast)).toBeTruthy();
        expect(Helper.compareStuff("2019-11-01", "2019-11-01", ComparisonOperator.GreaterThan)).toBeFalsy();
    })
    it("dates", ()=>{
        var date = new Date("2019-11-01T23:15:45.269Z");
        var d = Helper.dateToLocalYyyyMmDd(date);
        expect(d).toBe("2019-11-02", "if this test is executed in the east side of the world, it shall succeed");

        d = Helper.dateToLocalYyyyMm(date);
        expect(d).toBe("2019-11", "shall be able to return the yyyy-mm formatted date");
    })
    it("objectValues", ()=>{
        var n : StringKeyValuePairs = {"a":"b"};
        expect(Helper.ObjectValues(n)).toEqual(["b"]);
        expect(Helper.ObjectValues({"a":"b","c":"d"})).toEqual(["b", "d"]);
    })

    it('isNumber tests', () => {
        for(let i of [1, 1.0, 0, "0", "1", "1.1"]) {
           expect(Helper.isNumber(i)).toBeTruthy();
        }
        for(let i of [null, undefined, "whatever"]) {
            expect(Helper.isNumber(i)).toBeFalsy();
         }
    });

    it("filesize to human", ()=>{
        var s = Helper.humanFileSize(1024*1024+1);
        expect(s).toBe("1.0 MiB");
    });
    it('parseHumanSize tests', () => {
        expect(Helper.parseHumanSize("123")).toEqual(123);
        expect(Helper.parseHumanSize("2KB")).toEqual(2*1024);
        expect(Helper.parseHumanSize("2 KB")).toEqual(2*1024);
        expect(Helper.parseHumanSize("2 MB")).toEqual(2*1024*1024);
        expect(Helper.parseHumanSize("2 GB")).toEqual(2*1024*1024*1024);
    });
    it('array merging', () => {
        expect(Helper.uniqueArr(["a"],["b"],["c"])).toEqual(["a","b","c"]);
        expect(Helper.uniqueArr(["a"],["b", "a"],["c"])).toEqual(["a","b","c"]);
    });

    it('set merging', () => {
        expect(Array.from(Helper.mergeSets(new Set<string>(["a"]), new Set<string>(["b", "c"])))).toEqual(["a","b","c"]);
    });

    it('basename', () => {
        expect(Helper.getFileBaseName("/foo/bar.txt")).toEqual("bar.txt");
        expect(Helper.getFileBaseName("bar.txt")).toEqual("bar.txt");
        expect(Helper.getFileBaseName("/foo/bar.txt", false)).toEqual("bar.txt");
        expect(Helper.getFileBaseName("/foo/bar.txt", true)).toEqual("bar");
    });

    it('file extension', () => {
        expect(Helper.getFileExtension("/foo/bar.txt")).toEqual("txt");
        expect(Helper.getFileExtension("bar.json")).toEqual("json");
    });

    it('create helper', () => {
        class A {
            public data: string;
        }
        class B {
            public data: string;
            public getData(): string {
                return this.data;
            }
        }
        var str = "foobar";

        var a1 = Helper.create<A>(A, {data: str});
        expect(a1 instanceof A).toBeTruthy();
        expect(a1.data).toBe(str);

        var a2 = Helper.create(A, {data: str});
        expect(a2 instanceof A).toBeTruthy();
        expect(a2.data).toBe(str);

        var b1 = Helper.createRaw(B, {data: str});
        expect(b1 instanceof B).toBeTruthy();
        expect(b1.data).toBe(str);
        expect(b1.getData()).toBe(str);

    });

    it('create helper with fromJSON support', () => {
        class A {
            public data: string;
            public static fromJSON(inData: any): A
            {
                var a = new A();
                a.data = "X"+inData["data"]+"X";
                return a;
            }
        }

        var a1 = Helper.create<A>(A, {data: "foobar"});
        expect(a1 instanceof A).toBeTruthy();
        expect(a1.data).toBe("foobar");

        var a2 = Helper.create<A>(A, {data: "foobar"}, true);
        expect(a2 instanceof A).toBeTruthy();
        expect(a2.data).toBe("XfoobarX");
    });
    it('create helper with arraybuffers', () => {
        class A {
            public data: string;
            public static fromJSON(inData: any): A
            {
                var a = new A();
                a.data = "X"+inData["data"]+"X";
                return a;
            }

        }
        class B {
            public data: string;
        }

        var b = new B();
        b.data = "XXX";
        var ab = Helper.toJsonArrayBuffer(b);
        expect(ab.byteLength).toBe(14);
        var bclone = Helper.jsonArrayBufferToType(B, ab);
        expect(bclone instanceof B).toBeTruthy();
        expect(bclone.data).toBe("XXX");

        var a = new A();
        a.data = "foobar";
        ab = Helper.toJsonArrayBuffer(a);
        expect(ab.byteLength).toBe(17);
        var aclone = Helper.jsonArrayBufferToType(A, ab);
        expect(aclone instanceof A).toBeTruthy();
        expect(aclone.data).toBe("XfoobarX");
    });
    
    it("tag statistics transformation", ()=>{
        var v: TagWeightPairs = { a: 1, b: 2};
        var cd = Helper.transformTagStatisticsToCloudData(v);
        expect(cd).toEqual([{text: "a", weight: 1}, {text: "b", weight: 2}]);
    })

    it("image dimensions to tags", ()=>{
        var tags = Helper.imageDimensionsToTags(null);
        expect(tags).toEqual({}, "tags for null shall be empty")

        tags = Helper.imageDimensionsToTags({width: 10, height: 20});
        expect(tags).toEqual({"media.width": 10, "media.height": 20, "media.resolution": "10x20"});
    });

    it("wildcard string match", ()=>{
        expect(Helper.wildcardMatch("Bird123", "bird*")).toBeTruthy("shall be case insensitive by default!");
        expect(Helper.wildcardMatch("bird123", "bird*")).toBeTruthy();
        expect(Helper.wildcardMatch("123bird", "*bird")).toBeTruthy();
        expect(Helper.wildcardMatch("123bird123", "*bird*")).toBeTruthy();
        expect(Helper.wildcardMatch("bird123bird", "bird*bird")).toBeTruthy();
        expect(Helper.wildcardMatch("123bird123bird123", "*bird*bird*")).toBeTruthy();
        expect(Helper.wildcardMatch("s[pe]c 3 re$ex 6 cha^rs", "s[pe]c*re$ex*cha^rs")).toBeTruthy();
        expect(Helper.wildcardMatch("should not match", "should noo*oot match")).toBeFalsy();
    })

    it("traverse object using a string lookup key", ()=>{
        var obj = {
            "a": "b",
            "c": {
                "d": "foo",
                "e": 123,
            }
        }
        expect(Helper.access(obj, "a")).toBe("b");
        expect(Helper.access(obj, "x")).toBeUndefined()
        expect(Helper.access(obj, "a.b")).toBeUndefined()
        expect(Helper.access(obj, "c.b")).toBeUndefined()
        expect(Helper.access(obj, "c.d")).toBe("foo");
        expect(Helper.access(obj, "c.e")).toBe(123);

        var c = Helper.createRaw(CatalogFile, {
            tags: {
                "content.filename": "filename",
                "content.type": "type",
                "content.size": 123,
            },
            versions: ["234"]
        })

        expect(Helper.access(c, "tags.content.filename")).toBe("filename");
    })

    it("delete array by value", ()=>{
        var arr = ["1","2","3"];
        var r1 = Helper.deleteArrayValue(arr, "2");
        expect(r1).toEqual(true);
        expect(arr).toEqual(["1","3"]);

        var e1 = {"e":"1"};
        var e2 = {"e":"2"};
        var e3 = {"e":"3"};
        var arr2 = [e1,e2];
        var r2 = Helper.deleteArrayValue(arr2, e2);
        expect(r2).toEqual(true);
        expect(arr2).toEqual([e1]);

        var r3 = Helper.deleteArrayValue(arr2, e3);
        expect(r3).toEqual(false);    
    })

    it('dataUrl test', async () => {
        var buffer = new ArrayBuffer(12);
        var x = new Int32Array(buffer);
        x[1] = 1234;
        var str = await Helper.arrayBufferToDataUrl(buffer, "image/png");
        expect(str).toBe('data:image/png;base64,AAAAANIEAAAAAAAA');
    });

    it("base64 to arraybuffer test", ()=>{
        var buffer = Helper.base64ToArrayBuffer("AAAAANIEAAAAAAAA");
        var x = new Int32Array(buffer);
        expect(x[0]) .toEqual(0);
        expect(x[1]) .toEqual(1234);
        expect(x[2]) .toEqual(0);
    })

    it("trimSlashes tests", ()=>{
        expect(Helper.trimSlashes("whatever")) .toEqual("whatever");
        expect(Helper.trimSlashes("//whatever")) .toEqual("whatever");
        expect(Helper.trimSlashes("//whatever//")) .toEqual("whatever");
        expect(Helper.trimSlashes("whatever//")) .toEqual("whatever");
        expect(Helper.trimSlashes("whatever/")) .toEqual("whatever");
        expect(Helper.trimSlashes("wha//tever//")) .toEqual("wha/tever");
        expect(Helper.trimSlashes(null)) .toEqual("");
        expect(Helper.trimSlashes(undefined)) .toEqual("");
        expect(Helper.trimSlashes("")) .toEqual("");
    })
    
});

