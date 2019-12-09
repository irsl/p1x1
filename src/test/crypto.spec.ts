import { TestBed } from '@angular/core/testing';

import { Crypto, AesGcmWithIvOptions, EncryptedData, CatalogPasswordBlock, DerivedCatalog } from '../app/crypto';
import { Helper } from 'src/app/helper';

describe('CryptoService', () => {

  const SomeRawData = "hello world!";

  describe('crypto operations', () => {

    it('deriving authentication data from a password', async () => {
      var pw = await Crypto.DeriveAuthenticationHashFromPassword("123456") // the most popular password of 2018
      expect(pw).toEqual(
        {
          PasswordHash: '34564edda0edd414aaba3823acaa889d4afeb2cc93933a80898e369ca5678a3452f387f5e151c8fa4f4c723bf68d00c948126e1cff83e8c9f1cdacc87b511c4a',
          HashAlgorithm: 'SHA-512', 
          Iterations: 100 
        }
      )
    });

    it('full chain of raw operations', async () => {
      var wrapper = await Crypto.DeriveWrapperKeyFromPassword("123456") // the most popular password of 2018
      var sessionKey = await Crypto.GenerateSessionKey();
      var wrappedKey = await Crypto.WrapKey(sessionKey, wrapper.MasterKey);
      var unwrappedSessionKey = await Crypto.UnwrapSessionKey(wrappedKey, wrapper.MasterKey);
      expect(unwrappedSessionKey.CryptoOptions).toEqual(sessionKey.CryptoOptions);

      // ok, we now have two session keys and they are expected to be identical.
      // encrypting with the first, decrypting with the second.
      var rawData = Helper.StringToArrayBuffer(SomeRawData);
      var cryptoOptions = new AesGcmWithIvOptions();      
      var encryptedData = await Crypto.EncryptDataRaw(sessionKey, rawData, cryptoOptions);
      var decryptedData = await Crypto.DecryptDataRaw(unwrappedSessionKey, encryptedData, cryptoOptions);
      var decryptedDataAsString = Helper.ArrayBufferToUtf8String(decryptedData);
      expect(decryptedDataAsString).toBe(SomeRawData);
    });

    it('high level file encryption routines', async () => {
      var wrapper = await Crypto.DeriveWrapperKeyFromPassword("123456")
      var rawData = Helper.StringToArrayBuffer(SomeRawData);
      var encData = await Crypto.EncryptData(wrapper.MasterKey, rawData);
      expect(encData.WrappedSessionKey.WrappedKey.byteLength).toBeGreaterThan(16);
      var decryptedData = await Crypto.DecryptData(wrapper.MasterKey, encData);
      var decryptedDataAsString = Helper.ArrayBufferToUtf8String(decryptedData);
      expect(decryptedDataAsString).toBe(SomeRawData);
    });

    it('decryption with invalid key shall throw an exception', async () => {
      var rawData = Helper.StringToArrayBuffer(SomeRawData);

      var wrapper1 = await Crypto.DeriveWrapperKeyFromPassword("123456")
      var encData = await Crypto.EncryptData(wrapper1.MasterKey, rawData);

      var wrapper2 = await Crypto.DeriveWrapperKeyFromPassword("123456")
      var decData = await Crypto.DecryptData(wrapper2.MasterKey, encData);

      var decryptedDataAsString = Helper.ArrayBufferToUtf8String(decData);
      expect(decryptedDataAsString).toBe(SomeRawData);

      // and now lets check the same with a wrong password
      var wrapper3 = await Crypto.DeriveWrapperKeyFromPassword("123457");
      try{
        await Crypto.DecryptData(wrapper3.MasterKey, encData);
        fail("should have been a failure")
      }
      catch(err)
      {
        expect(err.name).toBe("OperationError");
      }

    });

    it('playing with the catalog passwords', async () => {
      var pw1 = "123456";
      var comment1 = "first entry";

      var pw2 = "123457";
      var comment2 = "second entry";

      var catalog = await Crypto.CatalogNewPasswordBlock(pw1, comment1);
      expect(catalog.WrappedMasterKeys.length).toBe(1);
      expect(catalog.WrappedMasterKeys[0].Comment).toBe(comment1)

      // now lets open it to obtain the master password
      var mk = await Crypto.CatalogOpenPasswordBlock(pw1, catalog);
      expect(mk.DecodedKeyBlock.Comment).toBe(comment1);
      await Crypto.CatalogAppendPasswordBlock(mk.MasterKey, pw2, comment2, catalog);
      expect(catalog.WrappedMasterKeys.length).toBe(2);
      expect(catalog.WrappedMasterKeys[0].Comment).toBe(comment1);
      expect(catalog.WrappedMasterKeys[1].Comment).toBe(comment2);

      // now lets see if we can open it still with the first password
      mk = await Crypto.CatalogOpenPasswordBlock(pw1, catalog);
      expect(mk.DecodedKeyBlock.Comment).toBe(comment1);

      // and also with the second password
      mk = await Crypto.CatalogOpenPasswordBlock(pw2, catalog);
      expect(mk.DecodedKeyBlock.Comment).toBe(comment2);

      // and invalid passwords shall throw
      try{
        await Crypto.CatalogOpenPasswordBlock("1234", catalog);
        fail("should have been a failure")
      }
      catch(err)
      {
        expect(err.message).toBe('Invalid password provided');
      }
    });

    it("standard hashing", async()=>{
        var original = "hello world";
        var buf = Helper.StringToArrayBuffer(original);
        var hash = await Crypto.CalculateHashAsHexString("SHA-256", buf);
        expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    })

  });
  
  describe('backup and subcatalog use cases', async () => {
      it('one shall be able to open catalogs using a master key backup', async () => {
        var password = "whatever";
        var catalogPasswordBlock = await Crypto.CatalogNewPasswordBlock(password, "comment");
        var catalogMasterKey = await Crypto.CatalogOpenPasswordBlock(password, catalogPasswordBlock);      

        var masterKeyBackup = await Crypto.ExportMasterKey(catalogMasterKey.MasterKey);
        // console.log("backup", masterKeyBackup);
        expect(masterKeyBackup.k).toBeTruthy();

        var reimportedMasterKey = await Crypto.ImportMasterKey(masterKeyBackup);
        
        // shall be accepted:
        await Crypto.CatalogVerifyMasterKey(reimportedMasterKey, catalogPasswordBlock);
      });

      it('creating a sub catalog using the master key of the parent', async () => {
        var password = "whatever";
        var subpassword = "subpassword";
        var subComment = "subcomment with password";

        var catalogPasswordBlock = await Crypto.CatalogNewPasswordBlock(password, "comment");
        var catalogMasterKey = await Crypto.CatalogOpenPasswordBlock(password, catalogPasswordBlock);      
        var parentMasterKey = catalogMasterKey.MasterKey;

        var subCatalogPasswordBlock = await Crypto.CatalogNewDerivedPasswordBlock(parentMasterKey);

        // now opening the subcatalogue using the master key of the parent!
        var childMasterKey = await Crypto.CatalogOpenDerivedPasswordBlock(parentMasterKey, subCatalogPasswordBlock);

        await Crypto.CatalogAppendPasswordBlock(childMasterKey, subpassword, subComment, subCatalogPasswordBlock);

        // at this point, we shall be able to open the subcatalogue using the subpassword
        var subCatalogMasterKey = await Crypto.CatalogOpenPasswordBlock(subpassword, subCatalogPasswordBlock);
        expect(subCatalogMasterKey.DecodedKeyBlock.Comment).toBe(subComment);

        // but it shall fail with the master password (as it does not belong to there)
        try{
          await Crypto.CatalogOpenPasswordBlock(password, subCatalogPasswordBlock);
          fail("should have been a failure")
        }
        catch(err)
        {
          expect(err.message).toBe('Invalid password provided');
        }        

      });

      
  });

  describe('json', () => {

    it('encrypted data serialization', async () => {
      var wrapper = await Crypto.DeriveWrapperKeyFromPassword("123456")
      var rawData = Helper.StringToArrayBuffer(SomeRawData);
      var encData = await Crypto.EncryptData(wrapper.MasterKey, rawData);
      var encDataJsonStr = JSON.stringify(encData);
      var encDataFromJson = JSON.parse(encDataJsonStr);
      
      expect(typeof(encDataFromJson.CipherOptions.iv)).toBe("string");
      expect(encDataFromJson.CipherOptions.iv).toBeTruthy();
      expect(typeof(encDataFromJson.CipherText)).toBe("string");
      expect(encDataFromJson.CipherText).toBeTruthy();

      var encDataTypeFromJson = EncryptedData.fromJSON(encDataFromJson);
      var encDataJsonStrAgain = JSON.stringify(encDataTypeFromJson);
      expect(encDataJsonStrAgain).toBe(encDataJsonStr);

      // now just testing whether we can indeed decrypt the stuff using the original in memory structures
      var decDataOriginal = await Crypto.DecryptData(wrapper.MasterKey, encData);

      var decData = await Crypto.DecryptData(wrapper.MasterKey, encDataTypeFromJson);

      var decDataStr = Helper.ArrayBufferToUtf8String(decData);
      expect(decDataStr).toBe(SomeRawData);
    });

    it('catalog password block serialization', async () => {
        var pw1 = "123456";
        var comment1 = "first entry";

        var catalog = await Crypto.CatalogNewPasswordBlock(pw1, comment1);
        var catalogJsonStr = JSON.stringify(catalog);
        var catalogDecodedFromJson = CatalogPasswordBlock.fromJSON(JSON.parse(catalogJsonStr));
        var catalogJsonStrAgain = JSON.stringify(catalogDecodedFromJson);

        expect(catalogJsonStrAgain).toBe(catalogJsonStr);

        // we shall still be able to open this catalog using our correct password:
        var catalogMasterKey = await Crypto.CatalogOpenPasswordBlock(pw1, catalogDecodedFromJson);      
        expect(catalogMasterKey.MasterKey).toBeTruthy();
    });

    it('derived catalog as json', async () => {
      var pw1 = "123456";
      var comment1 = "first entry";

      var masterKey = await Crypto.GenerateWrapperKey();
      var catalogPasswordBlock = await Crypto.CatalogNewDerivedPasswordBlock(masterKey)

      var derived = catalogPasswordBlock.Derived;
      expect(derived).toBeTruthy();
      expect(derived.Seed.byteLength).toEqual(16);

      var derivedAsJson = JSON.stringify(catalogPasswordBlock.Derived);
      var derivedAgain = DerivedCatalog.fromJSON(JSON.parse(derivedAsJson));
      expect(derivedAgain.Seed.byteLength).toEqual(16);

      expect(Helper.ArrayBufferToHexString(derivedAgain.Seed)).toEqual(Helper.ArrayBufferToHexString(derived.Seed));

      var catalogPasswordBlockAsJsonStr = JSON.stringify(catalogPasswordBlock);
      var catalogPasswordBlockAgain = CatalogPasswordBlock.fromJSON(JSON.parse(catalogPasswordBlockAsJsonStr));

      expect(catalogPasswordBlockAgain.Derived).toBeTruthy();


    });
  });

  it('reencrypting some stuff with a new masterkey', async () => {
    var rawData = Helper.StringToArrayBuffer(SomeRawData);

    var pwOld = await Crypto.DeriveWrapperKeyFromPassword("123456-old");
    var pwNew = await Crypto.DeriveWrapperKeyFromPassword("123456-new");
    var oldStuff = await Crypto.EncryptData(pwOld.MasterKey, rawData);
    var newEnc = await Crypto.ReencryptWrapper(oldStuff, pwOld.MasterKey, pwNew.MasterKey);
    var newStuff = new EncryptedData();
    newStuff.CipherText = oldStuff.CipherText;
    newStuff.CipherOptions = newEnc.CipherOptions;
    newStuff.WrappedSessionKey = newEnc.WrappedSessionKey;

    var decrypted = await Crypto.DecryptData(pwNew.MasterKey, newStuff);
    var decryptedStr = Helper.ArrayBufferToUtf8String(decrypted);
    expect(decryptedStr).toBe(SomeRawData);
    
    try{
      await Crypto.DecryptData(pwNew.MasterKey, oldStuff);
      fail("Should have failed 1")
    }catch(err){
      // expected
    }
    
    try{
      await Crypto.DecryptData(pwOld.MasterKey, newStuff);
      fail("Should have failed 2")
    }catch(err){
      // expected
    }

  });

  it("random password", async ()=>{
     var p1 = await Crypto.GenerateRandomPassword();
     expect(p1.length).toBeGreaterThan(31);
     var p2 = await Crypto.GenerateRandomPassword();
     expect(p2.length).toBeGreaterThan(31);

     expect(p1 == p2).toBeFalsy("must be different");
  })

});

