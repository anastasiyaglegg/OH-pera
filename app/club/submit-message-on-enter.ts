import type {KeyboardEvent} from 'react';

export function submitMessageOnEnter(event:KeyboardEvent<HTMLTextAreaElement>,busy:boolean){
 if(event.key!=='Enter'||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey)return;
 // Enter confirms composed text before it can act as a send shortcut.
 if(event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)return;
 event.preventDefault();
 if(event.repeat||busy||!event.currentTarget.value.trim())return;
 event.currentTarget.form?.requestSubmit();
}
