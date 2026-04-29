export const COLORMAPS = {
  "Psychedelic": `vec3 colormap(vec2 z){float r=sin(z.x*3.),g=sin(z.y*3.+2.1),b=sin(length(z)*3.+4.2);return .5+.5*vec3(r,g,b);}`,
  "Aurora":      `vec3 colormap(vec2 z){float h=atan(z.y,z.x)/6.28318+.5;float s=smoothstep(0.,2.,length(z));vec3 c=vec3(h*.4+.4,.8+.2*s,.6+.4*s);float H=c.x*6.;int i=int(H);float f=H-float(i);float p=c.z*(1.-c.y),q=c.z*(1.-c.y*f),t2=c.z*(1.-c.y*(1.-f));if(i==0)return vec3(c.z,t2,p);if(i==1)return vec3(q,c.z,p);if(i==2)return vec3(p,c.z,t2);if(i==3)return vec3(p,q,c.z);if(i==4)return vec3(t2,p,c.z);return vec3(c.z,p,q);}`,
  "Fire":        `vec3 colormap(vec2 z){float v=.5+.5*sin(length(z)*2.5);return vec3(pow(v,.4),pow(v,1.5),pow(v,4.));}`,
  "Ocean":       `vec3 colormap(vec2 z){float len=length(z);float v=.5+.5*(len*.8-.5)/(1.+abs(len*.8-.5));float ph=atan(z.y,z.x);vec3 col=.5+.5*vec3(sin(ph+v*4.),sin(ph+v*4.+2.094),sin(ph+v*4.+4.189));return col*vec3(.3,.75,1.);}`,
  "Neon":        `vec3 colormap(vec2 z){float a=atan(z.y,z.x)/3.14159;float m=log(length(z)+1.);float r=.5+.5*sin(a*6.28+m*4.),g=.5+.5*sin(a*6.28+m*4.+2.094),b=.5+.5*sin(a*6.28+m*4.+4.189);float br=.6+.4*sin(m*6.);return vec3(r,g,b)*br;}`,
  "Dusk":        `vec3 colormap(vec2 z){float t=.5+.5*sin(z.x*1.3+z.y*.7);vec3 a=vec3(.8,.3,.7),b=vec3(.2,.6,.9),c=vec3(.5,.4,.3),d=vec3(0.,.1,.8);return a+b*cos(6.28318*(c*t+d));}`,
  "Infrared":    `vec3 colormap(vec2 z){float v=.5+.5*sin(length(z)*1.8+atan(z.y,z.x));v=clamp(v,0.,1.);return vec3(v*v,v*.4*(1.-v)+v*v*.6,pow(1.-v,3.)*0.8);}`,
}
