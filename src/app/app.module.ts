// official
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// third party
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSortModule }from '@angular/material/sort';
import { MatSelectModule }from '@angular/material/select';
import { MatRadioModule }from '@angular/material/radio';
import { MatProgressBarModule }from '@angular/material/progress-bar';
import { MatChipsModule }from '@angular/material/chips';
import { MatIconModule }from '@angular/material/icon';
import { MatCheckboxModule }from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider'; 
import { MatAutocompleteModule } from '@angular/material/autocomplete'; 
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { PasswordStrengthMeterModule } from 'angular-password-strength-meter';
import { LightboxModule } from 'ngx-lightbox';
import { TagCloudModule } from 'angular-tag-cloud-module';

// custom
import { AppComponent } from './main.component';
import { DashboardComponent } from './dashboard.component';
import { CatalogsMountComponent } from './catalogs.mount.component';
import { CatalogsManageComponent } from './catalogs.manage.component';
import { PageNotFoundComponent } from './pagenotfound.component';
import { CatalogUploadComponent } from './catalog.upload.component';
import { CatalogDisplayComponent } from './catalog.display.component';
import { 
  EventCallbackComponent, 
  PasswordCallbackComponent, 
  OkCancelComponent, 
  CatalogChooserComponent,
  ErrorPromptComponent, 
  CreateNewStandardCatalogComponent,
  ShowMasterKeyComponent,
  EmbeddedTagEditorComponent,
  VideoPlayerComponent,
  ShowShareResultComponent,
  ClearShareFormComponent,
  ProtectedShareFormComponent,
} from './modal.service';
import {  TagEditorComponent, AutofocusDirective, ShowFirstErrorComponent, ClickNoPropagateDirective, ConfirmActionDirective, CatalogActionsDropdownComponent, CatalogWriteablesComponent, FiltersHelpComponent } from './misc.component';
import { SubCatalogCreateComponent } from './subcatalogcreate.component';
import { CatalogPasswordsComponent } from './catalog.passwords.component';
import { ImageEffectsComponent } from './image.effects.component';
import { DropZoneDirective } from './drop-zone.directive';
import { PresignedCatalogOpenComponent } from './catalog.presigned.open.component';

@NgModule({
  imports: [ 
    NgbModule, 
    BrowserModule, 
    LightboxModule,
    TagCloudModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSortModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatSliderModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,    
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', redirectTo: "/dashboard", pathMatch: "full" },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'subcatalog/new/:catalogId/:type', component: SubCatalogCreateComponent },
      { path: 'image/edit/:catalogId/:hash', component: ImageEffectsComponent },
      { path: 'filters/help', component: FiltersHelpComponent },
      { path: 'catalogs/mount', component: CatalogsMountComponent },
      { path: 'catalogs/manage', component: CatalogsManageComponent },
      { path: 'catalog/display/:catalogId', component: CatalogDisplayComponent },
      { path: 'catalog/display/:catalogId/:search', component: CatalogDisplayComponent },
      { path: 'catalog/upload/:catalogId', component: CatalogUploadComponent },
      { path: 'catalog/passwords/:catalogId', component: CatalogPasswordsComponent },      
      { path: 'catalog/shared/open/:presignedCatalogIndexUrl', component: PresignedCatalogOpenComponent },      
      { path: '404', component: PageNotFoundComponent },
      { path: '**', redirectTo: "/404" },
    ]),
    NoopAnimationsModule,
    PasswordStrengthMeterModule,
  ],
  declarations: [ 
    AppComponent, 
    DashboardComponent, 
    PageNotFoundComponent, 
    CatalogsMountComponent, 
    CatalogUploadComponent,
    CatalogDisplayComponent,
    TagEditorComponent,
    EventCallbackComponent, 
    PasswordCallbackComponent,
    OkCancelComponent,
    CatalogChooserComponent,
    ErrorPromptComponent,
    EmbeddedTagEditorComponent,
    VideoPlayerComponent,
    CreateNewStandardCatalogComponent,
    ShowMasterKeyComponent,
    AutofocusDirective,
    DropZoneDirective,
    ClickNoPropagateDirective,
    ConfirmActionDirective,
    ShowFirstErrorComponent,
    CatalogsManageComponent,
    CatalogActionsDropdownComponent,
    SubCatalogCreateComponent,
    CatalogWriteablesComponent,
    CatalogPasswordsComponent,
    ImageEffectsComponent,
    FiltersHelpComponent,
    ShowShareResultComponent,
    ClearShareFormComponent,
    ProtectedShareFormComponent,
    PresignedCatalogOpenComponent,
  ],
  bootstrap: [ 
    AppComponent 
  ],
  entryComponents: [
    EventCallbackComponent,
    PasswordCallbackComponent,
    OkCancelComponent,
    CatalogChooserComponent,
    ErrorPromptComponent,
    EmbeddedTagEditorComponent,
    CreateNewStandardCatalogComponent,
    VideoPlayerComponent,
    ShowMasterKeyComponent,
    ShowShareResultComponent,
    ClearShareFormComponent,
    ProtectedShareFormComponent,
  ]
})
export class AppModule { }
