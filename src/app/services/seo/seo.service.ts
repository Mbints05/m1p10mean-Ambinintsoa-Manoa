import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {Client} from '../../modules/application/example-landing-page/client';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SeoService {

  constructor(
    private meta: Meta,
    private titleService: Title,
    private http: HttpClient) {}

  rootURL='/api';

  public setMetaDescription(content: string) {

    this.meta.updateTag(
      {
        name: 'description',
        content: content
      });
  }

  public setMetaTitle(title:string) {

    this.titleService.setTitle(title);

  }

  public getVehicles(){
    return this.http.get(this.rootURL+'/listVehicle');
  }

  public prendreDepot(matricule: any){
    return this.http.get(this.rootURL+'/deposer/'+matricule)
  }

  public insertClient(client: Client):Observable<Client>{
    return this.http.post<Client>(this.rootURL+'/insertClient',client);
  }

  public verifLogin(form:any){
    return this.http.post(this.rootURL+'/verifLogin',{form});
  }

}
