import { Component } from 'angular2/core';
import { CORE_DIRECTIVES, FORM_DIRECTIVES } from 'angular2/common';
import { RouterLink } from "angular2/router";

import { Client } from '../../services/api';
import { SessionFactory } from '../../services/session';
import { MDL_DIRECTIVES } from '../../directives/material';
import { AutoGrow } from '../../directives/autogrow';
import { InfiniteScroll } from '../../directives/infinite-scroll';
import { CommentCard } from '../../controllers/cards/comment/comment';
import { TagsPipe } from '../../pipes/tags';
import { SignupModalService } from '../../components/modal/signup/service';

import { AttachmentService } from '../../services/attachment';
import {AnswerCard} from "../../cards/object/answer/answer";

@Component({
  selector: 'minds-answers',
  inputs: ['_object : object', '_reversed : reversed', 'limit'],
  templateUrl: 'src/controllers/qa/answers/list.html',
  directives: [ CORE_DIRECTIVES, MDL_DIRECTIVES, RouterLink, FORM_DIRECTIVES, AnswerCard, InfiniteScroll, AutoGrow ],
  pipes: [ TagsPipe ],
  bindings: [ AttachmentService ]
})

export class Answers {

  minds;
  object;
  guid: string = "";
  parent: any;
  comments : Array<any> = [];
  answers : Array<any> = [];

  content = '';
  reversed : boolean = false;
  session = SessionFactory.build();

  editing : boolean = false;

  showModal : boolean = false;

  limit : number = 5;
  offset : string = "";
  inProgress : boolean = false;
  canPost: boolean = true;
  triedToPost: boolean = false;
  moreData : boolean = true;

	constructor(public client: Client, public attachment: AttachmentService, private modal : SignupModalService){
    this.minds = window.Minds;
	}

  set _object(value: any) {
    this.object = value;
    this.guid = this.object.guid;
    if(this.object.entity_guid)
      this.guid = this.object.entity_guid;
    this.parent = this.object;
    this.load();
  }

  set _reversed(value: boolean){
    if(value)
      this.reversed = true;
    else
      this.reversed = false;
  }

  load(refresh = false){
    var self = this;
    this.inProgress = true;

    this.client.get('api/v1/answers/' + this.guid, { limit: this.limit, offset: this.offset, reversed: true })
      .then((response : any) => {
        if(!response.answers){
          self.moreData = false;
          self.inProgress = false;
          return false;
        }

        self.answers = response.answers.concat(self.answers);

        self.offset = response['load-previous'];
        if(!self.offset || self.offset == null)
          self.moreData = false;
        self.inProgress = false;
      })
      .catch((e) => {
        this.inProgress = false;
      });
  }

  post(e){
    e.preventDefault();

    if (!this.content && !this.attachment.has()) {
      return;
    }

    if (this.inProgress || !this.canPost) {
      this.triedToPost = true;
      return;
    }

    let data = this.attachment.exportMeta();
    data['comment'] = this.content;

    this.inProgress = true;
    this.client.post('api/v1/answers/' + this.guid, data)
    .then((response : any) => {
      this.attachment.reset();
      this.content = '';
      this.comments.push(response.comment);
      this.inProgress = false;
    })
    .catch((e) => {
      this.inProgress = false;
    });
  }

  isLoggedIn(){
    if(!this.session.isLoggedIn()){
      this.modal.setSubtitle("You need to be logged in to post an answer").open();
    }
  }


  delete(index : number){
    this.comments.splice(index, 1);
  }

  edited(index: number, $event) {
    this.comments[index] = $event.comment;
  }

  uploadAttachment(file: HTMLInputElement) {
    this.canPost = false;
    this.triedToPost = false;

    this.attachment.upload(file)
    .then(guid => {
      this.canPost = true;
      this.triedToPost = false;
      file.value = null;
    })
    .catch(e => {
      console.error(e);
      this.canPost = true;
      this.triedToPost = false;
      file.value = null;
    });
  }

  removeAttachment(file: HTMLInputElement) {
    this.canPost = false;
    this.triedToPost = false;

    this.attachment.remove(file).then(() => {
      this.canPost = true;
      this.triedToPost = false;
      file.value = "";
    }).catch(e => {
      console.error(e);
      this.canPost = true;
      this.triedToPost = false;
    });
  }

  getPostPreview(message){
    if (!message.value) {
      return;
    }

    this.attachment.preview(message.value);
  }

}
