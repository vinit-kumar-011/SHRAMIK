const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'SHRAMIK_Login_v3.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
class MockElement {
  constructor(id='') { this.id=id; this.value=''; this.type=''; this.hidden=false; this.disabled=false; this.className=''; this.textContent=''; this.attrs={}; this.listeners={}; this.children=[]; this.style={}; this.parentNode=null; this.classList={toggle:(name,on)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean)); if(on) set.add(name); else set.delete(name); this.className=[...set].join(' ');}}; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  async fire(type, event={}) { for (const fn of this.listeners[type]||[]) { const result=fn({ preventDefault(){}, target:this, ...event }); if(type!=='submit' && result && typeof result.then==='function') await result; } }
  setAttribute(k,v){this.attrs[k]=String(v)}
  getAttribute(k){return this.attrs[k] ?? null}
  querySelector(sel){ if(sel==='span') return this.span || (this.span=new MockElement(this.id+'-span')); return null; }
  append(child){child.parentNode=this;this.children.push(child); if(child.id) elements[child.id]=child;}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this); if(this.id)delete elements[this.id];}
  focus(){document.activeElement=this;}
}
const ids=['login-form','email','password','sign-in','sign-in-label','status','status-text','password-toggle','eye-slash','email-error','password-error','sign-in-arrow','forgot-password'];
const elements={}; for(const id of ids) elements[id]=new MockElement(id);
const document={activeElement:null,getElementById(id){return elements[id]||null;},createElement(tag){return new MockElement(tag);}};
elements['login-form'].addEventListener = MockElement.prototype.addEventListener;
// Model the static state from the document.
elements['email'].type='email'; elements['password'].type='password';
elements['sign-in-label'].textContent='Sign in';
elements['eye-slash'].hidden=true;
elements['sign-in-arrow'].hidden=false;
let timerCalls = 0;
const mockWindow={setTimeout(...args){timerCalls++; return setTimeout(...args);}};
const context={document,window:mockWindow,Promise,console};
vm.createContext(context); vm.runInContext(script,context,{timeout:3000});
async function run(){
  const report={};
  await elements['login-form'].fire('submit');
  report.emptySubmit={emailError:elements['email-error'].querySelector('span').textContent,passwordError:elements['password-error'].querySelector('span').textContent,focused:document.activeElement?.id,emailInvalid:elements.email.getAttribute('aria-invalid'),passwordInvalid:elements.password.getAttribute('aria-invalid')};
  elements.email.value='wrong-format'; await elements.email.fire('input');
  report.invalidEmailPersists={error:elements['email-error'].querySelector('span').textContent,visible:!elements['email-error'].hidden};
  elements.email.value='astro@example.in'; await elements.email.fire('input');
  report.validEmailClears={visible:!elements['email-error'].hidden,invalid:elements.email.getAttribute('aria-invalid')};
  elements.password.value='sample'; await elements.password.fire('input');
  report.passwordErrorClears={visible:!elements['password-error'].hidden,invalid:elements.password.getAttribute('aria-invalid')};
  await elements['password-toggle'].fire('click');
  report.passwordShow={type:elements.password.type,label:elements['password-toggle'].getAttribute('aria-label'),pressed:elements['password-toggle'].getAttribute('aria-pressed'),valuePreserved:elements.password.value==='sample'};
  await elements['password-toggle'].fire('click');
  report.passwordHide={type:elements.password.type,label:elements['password-toggle'].getAttribute('aria-label'),pressed:elements['password-toggle'].getAttribute('aria-pressed'),valuePreserved:elements.password.value==='sample'};
  await elements['login-form'].fire('submit');
  report.loadingImmediately={disabled:elements['sign-in'].disabled,label:elements['sign-in-label'].textContent,status:elements['status-text'].textContent};
  const timersAfterFirstSubmit = timerCalls;
  await elements['login-form'].fire('submit');
  report.duplicateSubmitBlocked = timerCalls === timersAfterFirstSubmit;
  await new Promise(r=>setTimeout(r,500));
  report.prototypeResult={disabled:elements['sign-in'].disabled,label:elements['sign-in-label'].textContent,status:elements['status-text'].textContent,role:elements.status.getAttribute('role'),ariaLive:elements.status.getAttribute('aria-live')};
  await elements['forgot-password'].fire('click');
  report.forgotPassword={status:elements['status-text'].textContent,role:elements.status.getAttribute('role'),ariaLive:elements.status.getAttribute('aria-live')};
  console.log(JSON.stringify(report,null,2));
  const failures=[];
  if(report.emptySubmit.focused!=='email'||!report.emptySubmit.emailError||!report.emptySubmit.passwordError) failures.push('empty submit validation');
  if(!report.invalidEmailPersists.visible) failures.push('invalid email persists');
  if(report.validEmailClears.visible||report.validEmailClears.invalid!=='false') failures.push('valid email clears');
  if(report.passwordShow.type!=='text'||!report.passwordShow.valuePreserved) failures.push('password show');
  if(report.passwordHide.type!=='password'||!report.passwordHide.valuePreserved) failures.push('password hide');
  if(!report.loadingImmediately.disabled||report.loadingImmediately.label!=='Checking availability…') failures.push('loading state');
  if(!report.duplicateSubmitBlocked) failures.push('duplicate submit blocked');
  if(!report.prototypeResult.status.includes('No credentials were sent to a server or persisted')||report.prototypeResult.disabled) failures.push('prototype result');
  if(!report.forgotPassword.status.includes('not connected')||report.forgotPassword.role!=='status') failures.push('forgot password state');
  if(failures.length){console.error('FAILED:',failures.join(', '));process.exitCode=1;} else console.log('All mock-DOM interaction assertions passed.');
}
run().catch(e=>{console.error(e);process.exit(1)});
