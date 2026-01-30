async function resolveMinecraftUuid(username){
  if(!username) return null;
  try{
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
    if(!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data.id : null;
  }catch(error){
    return null;
  }
}

module.exports = {
  resolveMinecraftUuid
};
