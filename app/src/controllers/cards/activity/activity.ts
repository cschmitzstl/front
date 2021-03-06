import { Component, EventEmitter, ElementRef} from 'angular2/core';
import { CORE_DIRECTIVES, FORM_DIRECTIVES } from 'angular2/common';
import { RouterLink } from "angular2/router";

import { Client } from '../../../services/api';
import { SessionFactory } from '../../../services/session';
import { Material } from '../../../directives/material';
import { AutoGrow } from '../../../directives/autogrow';
import { Hovercard } from '../../../directives/hovercard';
import { Remind } from '../remind/remind';
import { BUTTON_COMPONENTS } from '../../../components/buttons';
import { MindsVideo } from '../../../components/video';
import { Boost } from '../../boosts/boost/boost';
import { Comments } from '../../comments/comments';
import { MINDS_PIPES } from '../../../pipes/pipes';
import { TagsLinks } from '../../../directives/tags';
import { ScrollService } from '../../../services/ux/scroll';
import { ShareModal, ReportModal } from '../../../components/modal/modal';

import { AttachmentService } from '../../../services/attachment';
import { MindsRichEmbed } from '../../../components/rich-embed/rich-embed';

@Component({
  selector: 'minds-activity',
  host: {
    'class': 'mdl-card mdl-shadow--2dp'
  },
  inputs: ['object', 'commentsToggle', 'showBoostOptions: boostToggle', 'visible'],
  outputs: [ '_delete: delete'],
  bindings: [ AttachmentService ],
  templateUrl: 'src/controllers/cards/activity/activity.html',
  directives: [ CORE_DIRECTIVES, FORM_DIRECTIVES, BUTTON_COMPONENTS, Boost, Comments, Material, AutoGrow, Remind, RouterLink, TagsLinks, MindsVideo, ShareModal, ReportModal, MindsRichEmbed, Hovercard ],
  pipes: [ MINDS_PIPES ]
})

export class Activity {

  activity : any;
  menuToggle : boolean = false;
  commentsToggle : boolean = false;
  shareToggle : boolean = false;
  reportToggle: boolean = false;
  session = SessionFactory.build();
  showBoostOptions : boolean = false;
  type : string;
  element : any;
  visible : boolean = false;

  editing : boolean = false;

  _delete: EventEmitter<any> = new EventEmitter();
  scroll_listener;

  asyncMute: boolean = false;
  asyncMuteInProgress: boolean = false;

	constructor(public client: Client, public scroll : ScrollService, _element: ElementRef, public attachment: AttachmentService){
    this.element = _element.nativeElement;
    this.isVisible();
	}

  set object(value: any) {
    if(!value)
      return;
    this.activity = value;
    this.activity.url = window.Minds.site_url + 'newsfeed/' + value.guid;
  }

  save(){
    console.log('trying to save your changes to the server', this.activity);
    this.editing = false;
    this.client.post('api/v1/newsfeed/' + this.activity.guid, this.activity)
      .then((response : any) => {

      });
  }

  delete(){
    this.client.delete('api/v1/newsfeed/'+this.activity.guid);
    this._delete.next(true);
  }

  mute() {
    this.activity['is:muted'] = true;

    this.client.post(`api/v1/entities/notifications/${this.activity.guid}/mute`)
    .then((response: any) => {
      if (response.done) {
        this.activity['is:muted'] = true;
        return;
      }

      throw new Error('E_NOT_DONE');
    })
    .catch(e => {
      this.activity['is:muted'] = false;
    });
  }

  unmute() {
    this.activity['is:muted'] = false;

    this.client.post(`api/v1/entities/notifications/${this.activity.guid}/unmute`)
    .then((response: any) => {
      if (response.done) {
        this.activity['is:muted'] = false;
        return;
      }

      throw new Error('E_NOT_DONE');
    })
    .catch(e => {
      this.activity['is:muted'] = true;
    });
  }

  cardMenuHandler(opened: boolean) {
    this.asyncMuteFetch();
  }

  asyncMuteFetch() {
    if (this.asyncMute || this.asyncMuteInProgress) {
      return;
    }

    this.asyncMuteInProgress = true;

    this.client.get(`api/v1/entities/notifications/${this.activity.guid}`)
    .then((response: any) => {
      this.asyncMuteInProgress = false;
      this.asyncMute = true;

      this.activity['is:muted'] = !!response['is:muted'];
    })
    .catch(e => {
      this.asyncMuteInProgress = false;
    });
  }

  openComments(){
    this.commentsToggle = !this.commentsToggle;
  }

  showBoost(){
      this.showBoostOptions = !this.showBoostOptions;
  }

  isVisible(){
    if(this.visible){
      return true;
    }
    this.scroll_listener = this.scroll.listenForView().subscribe((view) => {
      if(this.element.offsetTop - this.scroll.view.clientHeight <= this.scroll.view.scrollTop && !this.visible){
        //stop listening
        this.scroll.unListen(this.scroll_listener);
        //make visible
        this.visible = true;
        //update the analytics
        this.client.put('api/v1/newsfeed/' + this.activity.guid + '/view');
        }
    });
    //this.scroll.fire();
  }

  ngOnDestroy(){
    this.scroll.unListen(this.scroll_listener);
  }
}
