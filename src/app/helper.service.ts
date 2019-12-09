import { Injectable } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Helper } from "./helper";
import { Location } from "@angular/common";
import { UrlTree, NavigationExtras } from "@angular/router";
import { ActivatedRoute, Params, Router } from '@angular/router';

export interface WindowUrl {
    rawUrl?: string;
    safeUrl?: SafeUrl;
}
@Injectable({
    providedIn: 'root'
  })
  export class HelperService {
      constructor(
          private sanitizer: DomSanitizer, 
          private location: Location,
          private router: Router,
      )
      {        
      }

      public arrayBufferToSanitizedWindowUrl(arrayBuffer: ArrayBuffer, contentType: string): WindowUrl
      {        
          var url = Helper.arrayBufferToWindowUrl(arrayBuffer, contentType);
          return {
              rawUrl: url,
              safeUrl: this.sanitizer.bypassSecurityTrustUrl(url),
          }
      }
      public generateExternalUrlForComponents(components: any[], fragment?: string): string
      {
         var uri = this.router.createUrlTree(components);
         var url = this.generateExternalUrl(uri);
         if(fragment) url += "#"+fragment;
         
         return url;
      }

      public generateExternalUrl(urlTree: string|UrlTree): string
      {
          const path = this.location.prepareExternalUrl(urlTree.toString());
          const url = window.location.origin + path;
          return url;
      }
  
  }
  