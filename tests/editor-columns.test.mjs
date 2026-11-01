import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { insertInColumn, removeColumn } from "../lib/editor-columns.js";
const schema = new Schema({nodes:{doc:{content:"block+"},text:{},paragraph:{group:"block",content:"text*"},image:{group:"block",atom:true,attrs:{src:{default:""}}},columnRow:{group:"block",content:"column{2,12}"},column:{content:"block+",attrs:{span:{default:6}}}}});
const image = src => schema.node("image",{src});
const paragraph = text => schema.node("paragraph",null,text ? [schema.text(text)] : []);
class Box {
 constructor(rect){this.rect=rect;}
 getBoundingClientRect(){return this.rect;}
}
function fixture() {
 let state = EditorState.create({doc:schema.node("doc",null,[schema.node("columnRow",null,[schema.node("column",null,[image("left.png")]),schema.node("column",null,[image("right.png"),paragraph("Caption")])])])});
 const dom = new Map();
 state.doc.descendants((node,pos)=>{
  const right = pos >= 4;
  const left=right?300:0;
  dom.set(pos,new Box({left,right:left+300,top:0,bottom:node.type.name==="column"?200:80,height:node.type.name==="column"?200:80,width:300}));
 });
 const view={get state(){return state;},nodeDOM:pos=>dom.get(pos),dispatch:tr=>{state=state.apply(tr);},focus(){}};
 return {view,get state(){return state;}};
}
test("a dropped image joins the second column after existing content",()=>{
 const original=globalThis.Element;globalThis.Element=Box;
 try {
 const editor=fixture();
 assert.equal(insertInColumn(editor,{clientX:450,clientY:180},image("new.png").toJSON()),true);
 const row=editor.state.doc.firstChild;
 assert.equal(row.child(0).childCount,1);
 assert.equal(row.child(1).childCount,3);
 assert.equal(row.child(1).lastChild.attrs.src,"new.png");
 editor.state.doc.check();
 } finally {globalThis.Element=original;}
});
test("moving the only image out of a column preserves a valid empty column",()=>{
 const original=globalThis.Element;globalThis.Element=Box;
 try {
 const editor=fixture();
 assert.equal(insertInColumn(editor,{clientX:450,clientY:180},image("left.png").toJSON(),2),true);
 assert.equal(editor.state.doc.firstChild.child(0).firstChild.type.name,"paragraph");
 assert.equal(editor.state.doc.firstChild.child(1).lastChild.attrs.src,"left.png");
 editor.state.doc.check();
 } finally {globalThis.Element=original;}
});


test("deleting one of two columns unwraps the survivor without losing its blocks", () => {
 const editor = fixture();
 assert.equal(removeColumn(editor, 0, 0), true);
 assert.equal(editor.state.doc.childCount, 2);
 assert.equal(editor.state.doc.firstChild.attrs.src, "right.png");
 assert.equal(editor.state.doc.lastChild.textContent, "Caption");
 editor.state.doc.check();
});
