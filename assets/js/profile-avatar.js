(function(){
  "use strict";
  function userKey(){try{var u=window.MOSHAVER_AUTH&&window.MOSHAVER_AUTH.getUser?window.MOSHAVER_AUTH.getUser():JSON.parse(localStorage.getItem("moshaver_user")||"null");return String(u&&(u.userId||u.username)||"");}catch(_){return "";}}
  function apply(src){if(!src)return;document.querySelectorAll(".profile-mini .avatar").forEach(function(node){var img=node.querySelector("img");if(!img){node.textContent="";img=document.createElement("img");img.alt="عکس پروفایل";img.decoding="async";node.appendChild(img);}if(img.src!==src)img.src=src;});}
  var key=userKey();if(!key)return;
  var cacheKey="moshaver_profile_photo:"+key;
  try{var cached=sessionStorage.getItem(cacheKey);if(cached)apply(cached);}catch(_){}
  if(!window.MOSHAVER_API||!window.MOSHAVER_API.readMyProfilePhoto)return;
  window.MOSHAVER_API.readMyProfilePhoto().then(function(result){if(result&&result.dataUrl){apply(result.dataUrl);try{sessionStorage.setItem(cacheKey,result.dataUrl);}catch(_){}}}).catch(function(){});
})();