// Gera um único HTML offline (sem multiplayer): node scripts/build-single.js > war-amazonas.html
const fs=require("fs"),p=require("path"),b=p.join(__dirname,"../public/");
let h=fs.readFileSync(b+"index.html","utf8");
h=h.replace('<link rel="stylesheet" href="css/style.css">',"<style>"+fs.readFileSync(b+"css/style.css","utf8")+"</style>");
const img="data:image/jpeg;base64,"+fs.readFileSync(b+"assets/mapa.jpg").toString("base64");
h=h.replace(/<script src="js\/net\.js"><\/script>/,"").replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>"<script>"+fs.readFileSync(b+s,"utf8").replace('const BG="assets/mapa.jpg"','const BG="'+img+'"').replace(/<\/script>/g,"<\\/script>")+"</script>");
h=h.replace(/ ?<button id="online">[^<]*<\/button>/,"").replace(/<div id="lobby"[^>]*><\/div>/,"");
process.stdout.write(h);
