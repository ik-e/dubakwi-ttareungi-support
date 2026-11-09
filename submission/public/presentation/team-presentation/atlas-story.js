// Display-only adaptation. The original scenario data, player and inspector remain intact.
const storyGraph=renderGraph;
renderGraph=function(){storyGraph();document.body.classList.toggle('story-overview',view==='overview');if(view==='overview')document.querySelectorAll('#graph .node-code').forEach(n=>n.style.display='none')};
sync();
