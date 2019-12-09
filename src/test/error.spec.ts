import { TestBed } from '@angular/core/testing';

import PixiError, { E } from '../app/error';

describe('error throwing', ()=>{
    
    it('errors shall have a proper attributes', () => {
       try{
           throw new PixiError(E.InvalidPasswordError);
       }catch(err){
           expect(err.errorCode).toBe(E.InvalidPasswordError);
           expect(err.message).toBe("Invalid password provided"); 
       }
    });
    
});

