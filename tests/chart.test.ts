import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {Chart} from '../src/components/UI';
it('places irregularly spaced buckets at their model timestamps rather than their array indices',()=>{
 const buckets=[0,300,1800].map(time=>({time,arrivals:10,present:5,visits:1,sales:10000,waitMean:0}));
 const svg=renderToStaticMarkup(createElement(Chart,{buckets,lang:'en',cursor:300}));
 expect(svg).toContain('L93.333');
 expect(svg).toContain('L380,');
 expect(svg).not.toContain('L724,');
});
