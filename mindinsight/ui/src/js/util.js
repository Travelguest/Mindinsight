/**
 * Generates a hash value of a string.
 * @param {String} str
 * @return {Number}
 */
 function genHash(str = '') {
  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i++) {
    hash += (hash << 5) + str.charCodeAt(i);
  }
  return hash & 0x7fffffff;
}


export {genHash};
