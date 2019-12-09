import { TestBed } from '@angular/core/testing';

import { CatalogService, MainCatalogFilename, StandardCatalogClear, CatalogFile, StandardCatalogProtected, StandardCatalog, SharedCatalogProtected, SharedCatalogClear } from '../app/catalog.service';
import { E } from '../app/error';
import { GetS3ConnectionForTesting } from './s3.spec';
import { S3Service, S3Connection } from '../app/s3';
import { Helper } from '../app/helper';
import { EventSeverity } from 'src/app/catalog.common';
import { HttpClientModule } from '@angular/common/http';
import { HttpClientService } from 'src/app/httpclient.service';

describe('CatalogService', () => {
    var typicalContentType = "image/jpeg";
    var typicalFilename = "whatever.jpg";
    var typicalTags = {"foo": ""};

    var mtime = new Date("2019-11-02T21:39:40.891Z");

    var typicalPassword = "whatever";

    var testDataMainFile = "main file";
    var testDataMainFileBuffer = Helper.StringToArrayBuffer(testDataMainFile);
    var expectedFilenameHash = "e6517e54d50498270b6530678fcbd45ad63cd066b8cc7ad084118f46ab8f93ad";

    var subdirForSubdirTests = "subdir";

    var testDataThumbnail = "thumbnail";
    var testDataThumbnailBuffer = Helper.StringToArrayBuffer(testDataThumbnail);
    var typicalVersions = [{versionName:"thumbnail", data: testDataThumbnailBuffer, contentType: "image/jpeg"}];

    let service: CatalogService;

    let catalogFile = Helper.createRaw(CatalogFile, {
        tags: {
            "foo": "bar",
            "content.filename": "original-filename.jpg",
            "content.type": typicalContentType,
            "content.size": testDataMainFile.length,
            "hash.SHA-256": "hash",
        },
        versions: ["", "foo"]
    });
    let catalogFile2 = Helper.createRaw(CatalogFile, {
        tags: {},
        versions: ["", "foo"]
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                HttpClientService,
              ],    
        });
        service = TestBed.get(CatalogService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('date handling', () => {

        catalogFile2.initUploadDate();
        expect(catalogFile2.tags["date.upload"]).toBeTruthy();

        expect(catalogFile2.getCreationDate()).toBeNull("if creation date tag is not set, this method shall return null");
    });

    it('filename derivation, cleartext catalogs', () => {

        expect(StandardCatalogClear.GetS3KeyForFile(catalogFile, "")).toBe("original-filename.jpg");
        expect(StandardCatalogClear.GetS3KeyForFile(catalogFile, "thumbnail-64x64")).toBe("original-filename.thumbnail-64x64.jpg");

        expect(StandardCatalogClear.GetKeyForBackupCatalogEntry(catalogFile)).toBe("original-filename.jpg.backup");
    });

    it('filename derivation, protected catalogs', () => {

        expect(StandardCatalogProtected.GetS3KeyForFile(catalogFile, "")).toBe("hash");
        expect(StandardCatalogProtected.GetS3KeyForFile(catalogFile, "thumbnail-64x64")).toBe("hash.thumbnail-64x64");

        expect(StandardCatalogProtected.GetKeyForBackupCatalogEntry(catalogFile)).toBe("hash.backup");
    });

    it('creating a new password protected catalog', async () => {
        var conn = GetS3ConnectionForTesting("new");
        var expectedShortId = conn.getShortId();
        var s3 = new S3Service(conn);
        
        // for test robustness, we remove the index first
        await s3.Delete([{Key: MainCatalogFilename}]);

        var catalog = await service.CreateStandardCatalog(conn, typicalPassword, undefined);
        // opening without any password shall throw
        try{
            await service.OpenStandardCatalog(conn, []);
            fail("should have been a failure")
        }
        catch(e)
        {
            expect(e.errorCode).toBe(E.CatalogIsPasswordProtectedError);
        }


        // opening with a wrong password shall fail
        try{
            await service.OpenStandardCatalog(conn, ["wrongpassword"]);
            fail("should have been a failure")
        }
        catch(e)
        {
            expect(e.errorCode).toBe(E.CatalogIsPasswordProtectedError);
        }

        // opening with a password provider that interrupts the process shall fail
        try{
            await service.OpenStandardCatalog(conn, [], (conn)=>{
                return null;
            });
            fail("should have been a failure")
        }
        catch(e)
        {
            expect(e.errorCode).toBe(E.CatalogIsPasswordProtectedError);
        }

        // but opening it with the correct one shall work:
        var c2 = await service.OpenStandardCatalog(conn, [typicalPassword]);
        expect(c2.getShortId()).toBe(expectedShortId);

        // opening it with the password provider callback:
        var c3 = await service.OpenStandardCatalog(conn, [], async (s3)=>{
            expect(s3.getShortId()).toBe(expectedShortId);
            return typicalPassword;
        });
        expect(c3.getShortId()).toBe(expectedShortId);
        

        // and creating a catalog at the same location again shall throw
        try {
            await service.CreateStandardCatalog(conn, typicalPassword, undefined);
            fail("should have been a failure")
        }catch(e){
            expect(e.errorCode).toBe(E.CatalogAlreadyExistsError);
        }

        var unk = (c2 as StandardCatalog).getUnknownFiles();
        expect(unk).toEqual(["test.json"]);
        var shared = (c2 as StandardCatalog).getSharedCatalogIndexes();
        expect(shared).toEqual(["shared.catalog.json"]);

        // and cleanup
        s3.Delete([{Key: MainCatalogFilename}]);
    });

    it('opening an empty bucket shall throw', async () => {

        var conn = GetS3ConnectionForTesting("empty");

        try {
            await service.OpenStandardCatalog(conn, [typicalPassword]);
            fail("should have been a failure")
        }catch(e){
            expect(e.errorCode).toBe(E.CatalogEmptyError);
        }

        // same without a password:
        try {
            await service.OpenStandardCatalog(conn, []);
            fail("should have been a failure")
        }catch(e){
            expect(e.errorCode).toBe(E.CatalogEmptyError);
        }

    });

    it('opening a corrupt catalog shall throw', async () => {
        var password = "whatever2";
        var conn = GetS3ConnectionForTesting("corrupt");

        try {
            await service.OpenStandardCatalog(conn, [password]);
            fail("should have been a failure 1")
        }catch(e){
            expect(e.errorCode).toBe(E.UnableToParseCatalogIndexError);
        }

        // same without a password:
        try {
            await service.OpenStandardCatalog(conn, []);
            fail("should have been a failure 2")
        }catch(e){
            expect(e.errorCode).toBe(E.UnableToParseCatalogIndexError);
        }

    });


    it('typical operations on an encrypted catalog (upload/download/delete)', async () => {

        var conn = GetS3ConnectionForTesting("typical-catalog-enc");
        var s3 = new S3Service(conn);

        // for test robustness, we make sure no files uploaded during an earlier session are present
        await s3.DeleteEverythingBut(["start.json"]);

        // for test robustness, we make sure we start from the catalog with no files
        var dl = await s3.Download("start.json")    
        await s3.Upload(MainCatalogFilename, dl.Data, "application/json");

        // but opening it with the correct one shall work:
        var catalog = await service.OpenStandardCatalog(conn, [typicalPassword]) as StandardCatalog;

        var files = await catalog.getFiles()
        expect(files).toEqual([]);

        var cf = await catalog.uploadFile({
            contentType: typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: typicalVersions,
        }, CatalogService.swallow);
        expect(cf.file.getSha256Hash()).toBe(expectedFilenameHash);

        var listResult = await s3.List();
        // console.log(listResult.KeyToObjectMap);
        for (let q of ["", ".backup", ".thumbnail"]) {
            var fn = expectedFilenameHash+q;
            expect(listResult.KeyToObjectMap[fn]).toBeTruthy();

            dl = await s3.Download(fn);
            expect(Helper.ArrayBufferToUtf8String(dl.Data).indexOf("CipherText")).toBeTruthy();    
        }

        // and shall be there inside the catalog as well:
        for(var i = 0; i < 2; i++) {
            files = await catalog.getFiles()
            expect(files.length).toBe(1);
            expect(files[0].catalog).toBe(catalog);
            expect(files[0].file.getContent()).toEqual({
                "type": typicalContentType,
                "filename": typicalFilename,
                "size": testDataMainFile.length.toString(),
            });
            expect(files[0].file.getHashes()).toEqual({
                "SHA-256": expectedFilenameHash
            });

            for(var q of Object.keys(typicalTags))
            {
                var v = typicalTags[q];
                expect(files[0].file.tags[q]).toBe(v);
            }
            expect(files[0].file.tags["date.upload"]).toBeTruthy();
            expect(files[0].file.getUploadDate()).toBeTruthy();

            // opening it again (just to ensure the files are visible even after a reopen)
            catalog = await service.OpenStandardCatalog(conn, [typicalPassword]) as StandardCatalog;
        }

        var unknowns = catalog.getUnknownFiles();
        expect(unknowns.length).toBe(1, "no unknown files shall be present");
        expect(unknowns[0]).toBe("start.json");

        // so far so good! lets fetch back the content
        var actualData = await catalog.downloadOriginalFile(files[0].file)
        var actualDataStr = Helper.ArrayBufferToUtf8String(actualData);
        expect(actualDataStr).toBe(testDataMainFile);

        actualData = await catalog.downloadFileVersion(files[0].file, "thumbnail")
        actualDataStr = Helper.ArrayBufferToUtf8String(actualData);
        expect(actualDataStr).toBe(testDataThumbnail);

        // saving new tags
        var file = catalog.getFileByName(typicalFilename);
        expect(file).toBeTruthy();
        expect(file.tags["something"]).toBeFalsy();
        file.tags["something"] = "new";
        await catalog.saveFileMeta(file, CatalogService.swallow);
        
        catalog = await service.OpenStandardCatalog(conn, [typicalPassword]) as StandardCatalog;
        file = catalog.getFileByName(typicalFilename);
        expect(file).toBeTruthy();
        expect(file.tags["something"]).toBe("new");

        await catalog.removeFile(files[0].file, CatalogService.swallow);
        listResult = await s3.List();
        for (let q of ["", ".meta", ".backup", ".backup.meta", ".thumbnail", ".thumbnail.meta"]) {
            var fn = expectedFilenameHash+q;
            expect(listResult.KeyToObjectMap[fn]).toBeFalsy();
        }

        file = catalog.getFileByName(typicalFilename);
        expect(file).toBeFalsy();

        files = await catalog.getFiles()
        expect(files.length).toBe(0);

    });

    it('typical operations on a clear catalog (upload/download/delete)', async () => {
        var expectedFileNames = ["whatever.jpg", "whatever.jpg.backup", "whatever.thumbnail.jpg"];

        var conn = GetS3ConnectionForTesting("typical-catalog-clear");
        var s3 = new S3Service(conn);

        // for test robustness, we make sure no file uploaded during an earlier session is not present
        await s3.DeleteEverythingBut(["start.json"]);

        // for test robustness, we make sure we start from the catalog with no files
        var dl = await s3.Download("start.json")    
        await s3.Upload(MainCatalogFilename, dl.Data, "application/json");

        // but opening it with the correct one shall work:
        var catalog = await service.OpenStandardCatalog(conn, []) as StandardCatalog;

        var files = await catalog.getFiles()
        expect(files).toEqual([]);

        await catalog.uploadFile({
            contentType: typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: typicalVersions,
        }, CatalogService.swallow);

        var listResult = await s3.List();
        // console.log(listResult.KeyToObjectMap);
        for (let fn of expectedFileNames) {
            expect(listResult.KeyToObjectMap[fn]).toBeTruthy();
        }

        // pure unencrypted file content shall be present:
        dl = await s3.Download("whatever.jpg");
        expect(Helper.ArrayBufferToUtf8String(dl.Data)).toBe(testDataMainFile);
        dl = await s3.Download("whatever.thumbnail.jpg");
        expect(Helper.ArrayBufferToUtf8String(dl.Data)).toBe(testDataThumbnail);

        // and shall be there inside the catalog as well:
        for(var i = 0; i < 2; i++) {
            files = await catalog.getFiles();
            expect(files.length).toBe(1);
            expect(files[0].catalog).toBe(catalog);
            expect(files[0].file.getContent()).toEqual({
                "type": typicalContentType,
                "filename": typicalFilename,
                "size": testDataMainFile.length.toString(),
            });
            expect(files[0].file.getHashes()).toEqual({
                "SHA-256": expectedFilenameHash
            });

            for(var q of Object.keys(typicalTags))
            {
                var v = typicalTags[q];
                expect(files[0].file.tags[q]).toBe(v);
            }
            expect(files[0].file.tags["date.upload"]).toBeTruthy();
            expect(files[0].file.getUploadDate()).toBeTruthy();

            // opening it again (just to ensure the files are visible even after a reopen)
            catalog = await service.OpenStandardCatalog(conn, []) as StandardCatalog;
        }

        // so far so good! lets fetch back the content via the catalog object as well
        var actualData = await catalog.downloadOriginalFile(files[0].file)
        var actualDataStr = Helper.ArrayBufferToUtf8String(actualData);
        expect(actualDataStr).toBe(testDataMainFile);

        actualData = await catalog.downloadFileVersion(files[0].file, "thumbnail")
        actualDataStr = Helper.ArrayBufferToUtf8String(actualData);
        expect(actualDataStr).toBe(testDataThumbnail);

        // saving new tags
        var file = catalog.getFileByName(typicalFilename);
        expect(file).toBeTruthy();
        expect(file.tags["something"]).toBeFalsy();
        file.tags["something"] = "new";
        await catalog.saveFileMeta(file, CatalogService.swallow);
        
        catalog = await service.OpenStandardCatalog(conn, []) as StandardCatalog;
        file = catalog.getFileByName(typicalFilename);
        expect(file).toBeTruthy();
        expect(file.tags["something"]).toBe("new");


        await catalog.removeFile(files[0].file, CatalogService.swallow);
        listResult = await s3.List();
        for (let fn of expectedFileNames) {
            expect(listResult.KeyToObjectMap[fn]).toBeFalsy();
        }

        file = catalog.getFileByName(typicalFilename);
        expect(file).toBeFalsy();

        files = await catalog.getFiles()
        expect(files.length).toBe(0);

    });

    it('uploading the same data with different names shall be detected (and not uploaded)', async () => {

        var conn = GetS3ConnectionForTesting("new-dupe");
        var expectedShortId = conn.getShortId();
        var s3 = new S3Service(conn);
        
        // for test robustness, we remove the index first
        await s3.DeleteEverythingBut([]);

        var catalog = await service.CreateStandardCatalog(conn, typicalPassword);
        await catalog.uploadFile({
            contentType:typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: [],
        }, CatalogService.swallow);

        var wasDupe = false;
        await catalog.uploadFile({
            contentType: typicalContentType,
            filename: "something-completely-different.jpg",
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: [],
        }, (a, m)=>{
            if(m.indexOf(" is already uploaded under name whatever.jpg"))
              wasDupe = true;
        });

        expect(wasDupe).toBeTruthy();

    });

    it('creating subdirs - cleartext parent, cleartext subdir', async () => {

        await subdirTest(async (parentConn: S3Connection, s3Parent: S3Service, childConn: S3Connection, s3Child: S3Service) =>{
            var parent = await service.CreateStandardCatalog(parentConn);    
            var child = await service.CreateClearSubCatalog(parent, subdirForSubdirTests);
            return {
                parent: parent,
                child: child,
            };            
        },
        async (parent: StandardCatalog, child: StandardCatalog) =>{
            var childAsOpen = await service.OpenStandardCatalog(child.getS3Connection(), []);
            var parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), []);

            // subcatalog shall return the complete url as uniq id:
            var str = childAsOpen.getUniqueId();
            expect(str).toBe("http://127.0.0.1:9000/subcat/subdir");

            return {
                child:childAsOpen,
                parent: parentAgain,
            }
        })
    });

    it('creating subdirs - password protected parent, cleartext subdir', async () => {

        await  subdirTest(async (parentConn: S3Connection, s3Parent: S3Service, childConn: S3Connection, s3Child: S3Service) => {
            var parent = await service.CreateStandardCatalog(parentConn, typicalPassword);
            var child = await service.CreateClearSubCatalog(parent, subdirForSubdirTests);
            return {
                parent: parent,
                child: child,
            };    
        },
        async (parent: StandardCatalog, child: StandardCatalog) =>{
            var childAsOpen = await service.OpenStandardCatalog(child.getS3Connection(), []);
            var parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), [typicalPassword]);
            return {
                child:childAsOpen,
                parent: parentAgain,
            }
        })

    });

    it('creating subdirs - cleartext parent, password protected subdir', async () => {
        await  subdirTest(async (parentConn: S3Connection, s3Parent: S3Service, childConn: S3Connection, s3Child: S3Service) => {
            var parent = await service.CreateStandardCatalog(parentConn);    
            var child = await service.CreateProtectedSubCatalog(parent, subdirForSubdirTests, typicalPassword, "some comment", CatalogService.swallow);
            return {
                parent: parent,
                child: child,
            };    
        },
        async (parent: StandardCatalog, child: StandardCatalog) =>{
            var childAsOpen = await service.OpenStandardCatalog(child.getS3Connection(), [typicalPassword]);
            // this is supposed to succeed:
            var parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), []);
            expect(parentAgain.getSubCatalogs().length).toBe(0, "but without the subcatalog (ass it is password protected and we did not provide one)");

            var passwordPromptWasCalled = false;
            parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), [], async (s3conn)=>{
                passwordPromptWasCalled = true;
                return typicalPassword;
            });
            expect(passwordPromptWasCalled).toEqual(true, "the password prompt is expected to be called");
            expect(parentAgain.getSubCatalogs().length).toBe(1, "and this way the subcatalog shall be opened correctly");

            // now doing it again with the correct pw directly
            parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), [typicalPassword]);
            return {
                child:childAsOpen,
                parent: parentAgain,
            }
        })


    });

    it('creating subdirs - password protected parent, password protected subdir', async () => {
        await subdirTest(async (parentConn: S3Connection, s3Parent: S3Service, childConn: S3Connection, s3Child: S3Service) => {
            var parent = await service.CreateStandardCatalog(parentConn, typicalPassword);
            var child = await service.CreateProtectedSubCatalog(parent, subdirForSubdirTests, typicalPassword, "some comment", CatalogService.swallow);
            return {
                parent: parent,
                child: child,
            };
        },
        async (parent: StandardCatalog, child: StandardCatalog) =>{
            var childAsOpen = await service.OpenStandardCatalog(child.getS3Connection(), [typicalPassword]);
            var parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), [typicalPassword]);
            return {
                child:childAsOpen,
                parent: parentAgain,
            }
        })

    });

    it('creating subdirs - password protected parent, password derived subdir', async () => {
        await subdirTest(async (parentConn: S3Connection, s3Parent: S3Service, childConn: S3Connection, s3Child: S3Service) => {
            var parent = await service.CreateStandardCatalog(parentConn, typicalPassword) as StandardCatalogProtected;
            var child = await service.CreateKeyDerivedSubCatalog(parent, subdirForSubdirTests, CatalogService.swallow);            
            return {
                parent: parent,
                child: child,
            };
        },
        async (parent: StandardCatalog, child: StandardCatalog) => {
            var parentAgain = await service.OpenStandardCatalog(parent.getS3Connection(), [typicalPassword]) as StandardCatalogProtected;            
            var childAsOpen = await service.OpenStandardCatalog(child.getS3Connection(), [], undefined, undefined, parentAgain.getMasterKey());
            return {
                child:childAsOpen,
                parent: parentAgain,
            }
        })

    });


    it('recovery: files that were removed in the meanwhile shall be removed from the clear catalog', async () => {

        var conn = GetS3ConnectionForTesting("recovery-delete-clear");
        var s3 = new S3Service(conn);
        
        // for test robustness, we remove the index first
        await s3.DeleteEverythingBut([]);
        var catalog = await service.CreateStandardCatalog(conn);
        var files = await catalog.getFiles();
        expect(files.length).toBe(0);

        await catalog.uploadFile({
            contentType: typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: [],
        }, CatalogService.swallow);

        // deleting both files that were just uploaded
        await s3.Delete([{Key: "whatever.jpg"},{Key: "whatever.jpg.backup"}]);

        var missing = false;
        var catalog2 = await service.OpenStandardCatalog(conn, [], undefined, (e,m)=>{
            if(m.indexOf("Missing file component is the main file, removing entry from catalog with the next save") == 0)
            {
                expect(e).toBe(EventSeverity.Error);
                missing = true;
            }
        });
        expect(missing).toBeTruthy();
        files = await catalog2.getFiles();
        expect(files.length).toBe(0);
    });

    it('recovery: files that were removed in the meanwhile shall be removed from the encrypted catalog', async () => {

        var conn = GetS3ConnectionForTesting("recovery-delete-enc");
        var s3 = new S3Service(conn);
        
        // for test robustness, we remove the index first
        await s3.DeleteEverythingBut([]);
        var catalog = await service.CreateStandardCatalog(conn, typicalPassword);
        var files = await catalog.getFiles();
        expect(files.length).toBe(0);

        await catalog.uploadFile({
            contentType: typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: [],
        }, CatalogService.swallow);

        // deleting both files that were just uploaded
        await s3.Delete([{Key: "e6517e54d50498270b6530678fcbd45ad63cd066b8cc7ad084118f46ab8f93ad"},{Key: "e6517e54d50498270b6530678fcbd45ad63cd066b8cc7ad084118f46ab8f93ad.backup"}]);

        var missing = false;
        var catalog2 = await service.OpenStandardCatalog(conn, [typicalPassword], undefined, (e,m)=>{
            if(m.indexOf("Missing file component is the main file, removing entry from catalog with the next save") == 0)
            {
                expect(e).toBe(EventSeverity.Error);
                missing = true;
            }
        });
        expect(missing).toBeTruthy();
        files = await catalog2.getFiles();
        expect(files.length).toBe(0);

    });

    it('recovery: files that were uploaded but missing from the clear catalog shall be re-added', async () => {

        var conn = GetS3ConnectionForTesting("recovery-readd-clear");
        var s3 = new S3Service(conn);
        
        // for test robustness, we remove the index first
        await s3.DeleteEverythingBut([]);
        var catalog = await service.CreateStandardCatalog(conn);
        var files = await catalog.getFiles();
        expect(files.length).toBe(0);

        // saving data at this point when the catalog does not contain any files yet
        var dl = await s3.Download(MainCatalogFilename);

        await catalog.uploadFile({
            contentType: typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: [],
        }, CatalogService.swallow);

        await s3.Upload(MainCatalogFilename, dl.Data);

        var readded = false;
        var catalog2 = await service.OpenStandardCatalog(conn, [], undefined, (e,m)=>{
            if(m.indexOf("which is not present in the main catalog") > 0)
               readded = true;
        });
        expect(readded).toBeTruthy();
        files = await catalog2.getFiles();
        expect(files.length).toBe(1);
        expect(files[0].file.getFilename()).toBe(typicalFilename);

        var d = await catalog2.downloadOriginalFile(files[0].file);
        var actual = Helper.ArrayBufferToUtf8String(d);
        expect(actual).toBe(testDataMainFile);
    });

    it('recovery: files that were uploaded but missing from the encrypted catalog shall be re-added', async () => {

        var conn = GetS3ConnectionForTesting("recovery-readd-enc");
        var s3 = new S3Service(conn);
        
        // for test robustness, we remove the index first
        await s3.DeleteEverythingBut([]);
        var catalog = await service.CreateStandardCatalog(conn, typicalPassword);
        var files = await catalog.getFiles();
        expect(files.length).toBe(0);

        // saving data at this point when the catalog does not contain any files yet
        var dl = await s3.Download(MainCatalogFilename);

        await catalog.uploadFile({
            contentType: typicalContentType,
            filename: typicalFilename,
            mtime: mtime,
            originalData: testDataMainFileBuffer,
            tags: typicalTags,
            versions: [],
        }, CatalogService.swallow);

        await s3.Upload(MainCatalogFilename, dl.Data);
        var readded = false;
        var catalog2 = await service.OpenStandardCatalog(conn, [typicalPassword], undefined, (e,m)=>{
            if(m.indexOf("which is not present in the main catalog") > 0)
               readded = true;
        });

        expect(readded).toBeTruthy();
        files = await catalog2.getFiles();
        expect(files.length).toBe(1);
        expect(files[0].file.getFilename()).toBe(typicalFilename);

        var d = await catalog2.downloadOriginalFile(files[0].file);

        var actual = Helper.ArrayBufferToUtf8String(d);
        expect(actual).toBe(testDataMainFile);

    });


    it('password management', async () => {
        var conn = GetS3ConnectionForTesting("pwmgmt");
        var s3 = new S3Service(conn);
        await s3.DeleteEverythingBut([]);
        var catalog = await service.CreateStandardCatalog(conn, "pw1", "comment1") as StandardCatalogProtected;
        await service.AddPassword(catalog, "pw2", "comment2");

        var pws = service.GetPasswords(catalog);
        expect(pws.length).toBe(2);
        expect(pws[0].Comment).toBe("comment1");
        expect(pws[1].Comment).toBe("comment2");

        // shall work with the old password still
        await service.OpenStandardCatalog(conn, ["pw1"]);
        // also with the new one
        await service.OpenStandardCatalog(conn, ["pw2"]);

        // removing an old password
        await service.DelPassword(catalog, pws[0], CatalogService.swallow);

        // and now it shall throw with the old pw:
        try{
            await service.OpenStandardCatalog(conn, ["pw1"]);
        }catch(e){
            expect(e.errorCode).toBe(E.CatalogIsPasswordProtectedError);
        }

        // but should still work with the new one:
        await service.OpenStandardCatalog(conn, ["pw2"]);
    });

    it('combined catalog', async () => {
        var conn1 = GetS3ConnectionForTesting("typical-catalog-clear");
        var conn2 = GetS3ConnectionForTesting("typical-catalog-enc");

        var cat1 = await service.OpenStandardCatalog(conn1, []);
        var cat2 = await service.OpenStandardCatalog(conn2, [typicalPassword]);

        var combined = service.NewCombinedCatalog();
        combined.AddSubCatalog(cat1);
        combined.AddSubCatalog(cat2);

        expect(combined.getSubCatalogById(cat1.getUniqueId())).toBe(cat1, "shall be able to find stuff by uniqueid");

        expect(combined.getSubCatalogs().length).toBe(2);

        // adding the same stuff
        combined.AddSubCatalog(cat2);

        // and it shall be still the same as dupe was not added:
        expect(combined.getSubCatalogs().length).toBe(2);


        combined.RemoveSubCatalog(cat1);
        expect(combined.getSubCatalogs().length).toBe(1);

    });

    it('tag statistics', async () => {
        var conn = GetS3ConnectionForTesting("tagstats");

        var cat = await service.OpenStandardCatalog(conn, []);

        var tagStats = cat.getTagStatisticsRecursively();
        expect(tagStats).toEqual({foo: 1, "bar":1, "content.filename": 2, "content.size": 2, "content.type": 2, "date.mtime": 2, "hash.SHA-256": 2, "date.upload": 2});

        tagStats = cat.getTagStatisticsRecursively({aggregateValues: false});
        expect(tagStats).toEqual({
            "foo": 1, 
            "bar=xxx": 1, 
            "content.filename=filename.jpg": 1, 
            "content.filename=filename2.jpg": 1, 
            "content.size=9": 2, 
            "content.type=image/jpeg": 2, 
            "date.mtime=2019-11-17T11:45:54.216Z": 2, 
            "hash.SHA-256=e6517e54d50498270b6530678fcbd45ad63cd066b8cc7ad084118f46ab8f93ad": 2, 
            "date.upload=2019-11-17T11:45:54.217Z": 2
        });

        tagStats = cat.getTagStatisticsRecursively({hideProtectedTags: true});
        expect(tagStats).toEqual({
            "foo": 1, 
            "bar": 1, 
        });

        tagStats = cat.getTagStatisticsRecursively({tagPrefix: "content.type", aggregateValues: false});
        expect(tagStats).toEqual({
            "image/jpeg": 2, 
        });

    });

    it('sharing files - cleartext', async () => {
        var sharedIndexFilename = "share.catalog.json";
        var conn = GetS3ConnectionForTesting("share-clear");
        var s3 = new S3Service(conn);
        await s3.Delete([{Key: sharedIndexFilename}])

        var cat = await service.OpenStandardCatalog(conn, []) as StandardCatalogClear;
        var file = cat.getFileByName("filename.jpg");
        var url = await cat.shareFilesClear("share", [file], 60, CatalogService.swallow);
        // console.log(url);
        expect(url.startsWith("http://127.0.0.1:9000/share-clear/share.catalog.json?X-Amz-Algorithm=")).toBeTruthy();
        var lr = await s3.List();
        expect(lr.KeyToObjectMap[sharedIndexFilename].Size).toBeGreaterThan(100);
        expect(cat.getSharedCatalogIndexes()).toEqual([sharedIndexFilename]);

        var cat2 = await service.OpenStandardCatalog(conn, []);
        expect(cat2.getSharedCatalogIndexes()).toEqual([sharedIndexFilename]);

        // and obviously these shared catalogs shall work so they can be opened
        var sharedCat = await service.OpenSharedCatalog(url, (aurl)=>{
            expect(aurl).toBe(url);
            return null;
        }, CatalogService.swallow)
        expect(sharedCat instanceof SharedCatalogClear).toBeTruthy();

        var files = await sharedCat.getFiles(null);
        expect(files.length).toBe(1);
        expect(files[0].file.getFilename()).toBe("filename.jpg");
        var file = sharedCat.getFileByName("filename.jpg");
        expect(file.getFilename()).toBe("filename.jpg");
        var downloaded = await sharedCat.downloadOriginalFile(files[0].file);
        var acont = Helper.ArrayBufferToUtf8String(downloaded);
        expect(acont).toBe(testDataMainFile);

    });

    it('sharing files - protected', async () => {
        var otherPassword = "some-other-password";

        var sharedIndexFilename = "share.catalog.json";
        var conn = GetS3ConnectionForTesting("share-enc");
        var s3 = new S3Service(conn);
        await s3.Delete([{Key: sharedIndexFilename}])

        var cat = await service.OpenStandardCatalog(conn, [typicalPassword]) as StandardCatalogProtected;
        var file = cat.getFileByName("filename.jpg");
        var url = await cat.shareFilesProtected("share", otherPassword, "some comment", [file], 60, CatalogService.swallow);
        // console.log(url);
        expect(url.startsWith("http://127.0.0.1:9000/share-enc/share.catalog.json?X-Amz-Algorithm=")).toBeTruthy();
        var lr = await s3.List();
        expect(lr.KeyToObjectMap[sharedIndexFilename].Size).toBeGreaterThan(100);
        expect(cat.getSharedCatalogIndexes()).toEqual([sharedIndexFilename]);

        var cat2 = await service.OpenStandardCatalog(conn, [typicalPassword]);
        expect(cat2.getSharedCatalogIndexes()).toEqual([sharedIndexFilename]);

        // the catalog cannot be opened without a correct password
        var calls = 0;
        try{
            await service.OpenSharedCatalog(url, async (aurl)=>{
                expect(aurl).toBe(url);
                calls++;
                if(calls == 1)
                   return "incorrectpassword";
                if(calls == 2)
                   return typicalPassword;
                return null;
            }, CatalogService.swallow)
            fail("should have failed");    
        }
        catch(e){
            // expected
        }
        expect(calls).toBe(3);

        // and obviously these shared catalogs shall work so they can be opened
        calls = 0;
        var sharedCat = await service.OpenSharedCatalog(url, async (aurl)=>{
            calls++;
            if(calls == 1)
               return otherPassword; // this is the correct password
            return null;
        }, CatalogService.swallow)
        expect(calls).toBe(1);
        expect(sharedCat instanceof SharedCatalogProtected).toBeTruthy();

        var files = await sharedCat.getFiles(null);
        expect(files.length).toBe(1);
        expect(files[0].file.getFilename()).toBe("filename.jpg");
        var file = sharedCat.getFileByName("filename.jpg");
        expect(file.getFilename()).toBe("filename.jpg");
        var downloaded = await sharedCat.downloadOriginalFile(files[0].file);
        var acont = Helper.ArrayBufferToUtf8String(downloaded);
        expect(acont).toBe(testDataMainFile);

    });

    interface SubdirTestReturn {
        parent: StandardCatalog;
        child: StandardCatalog;
    }

    async function subdirTest(
        callback1: (parentConn: S3Connection, s3Parent: S3Service, childConn: S3Connection, s3Child: S3Service) => Promise<SubdirTestReturn>,
        callback2: (parent: StandardCatalog, child: StandardCatalog) => Promise<SubdirTestReturn>
    ){

        var parentConn = GetS3ConnectionForTesting("subcat");
        var s3parent = new S3Service(parentConn);
        var childConn = S3Connection.AsSubdir(parentConn, subdirForSubdirTests);
        var s3child = new S3Service(childConn);


        // for test robustness, we remove the index first!
        await s3parent.DeleteEverythingBut([]);
        await s3child.DeleteEverythingBut([]);

        var main = await callback1(parentConn, s3parent, childConn, s3child);
        var child = main.child;
        var parent = main.parent;

        // now the tests
        expect(child.getSubCatalogs().length).toBe(0);
        expect(parent.getSubCatalogs().length).toBe(1);

        await child.uploadFile({
            contentType: typicalContentType, 
            originalData: testDataMainFileBuffer, 
            filename: typicalFilename, 
            mtime: mtime,
            tags: typicalTags, 
            versions: [],
        }, CatalogService.swallow)

        var second = await callback2(parent, child);

        var childAsOpen = second.child;
        var files = await childAsOpen.getFiles();
        expect(files.length).toBe(1);
        expect(files[0].file.getFilename()).toBe(typicalFilename);

        var parentAgain = second.parent;
        expect(parentAgain.getSubCatalogs().length).toBe(1, "after reopening the catalog, the subcatalog shall be detected and opened");

        var childAgain = parentAgain.getSubCatalogs()[0];
        files = await childAgain.getFiles();
        expect(files.length).toBe(1);
        expect(files[0].file.getFilename()).toBe(typicalFilename);


        // and some cleanup
        await s3parent.DeleteEverythingBut([]);
        await s3child.DeleteEverythingBut([]);

    }

});

