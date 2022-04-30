/**
 * This function can test if obj.key is exist or not, then return obj.key or default value
 * example:
 * const myObj = {
 * 	p1: {
 *		p11: 0,
 *		p12: 1
 *	},
 *	p2: {
 *		p21 :{
 *			p211: 2
 *		}
 *	}
 * }
 * console.log(myObj.p3.p31) //program stock here since myObj don't have an property calls p3
 * console.log(getKey(myObj, "p3.p31", "it works!") // will print "it works" and don't broke the server
 * console.log(getKey(myObj, "p2.p21.p211", "default value")) // will print 2 since myObj.p21.p211 exists.

 * @param  {string} obj config file name
 * @param  {string} key config access path in the config file
 * @param  {any}    or  default value if the config value does not exist
 * @return {any}        config value
 */
function getKey(obj, key, or = undefined) {
  return key.split('.').reduce(function(a,b){
  	const {obj, halt} = a;
  	if(halt) return a; //if halt === true just return a to prevent futher extract
  	if(obj && obj[b]) { //extract key b from obj;
  		return {obj: obj[b], halt}
  	} else { //if obj don't have key b, return default value and set halt = true
  		return {obj: or, halt: true}
  	}
  }, {obj, halt: false}).obj;
}

module.exports = {
  getKey
}