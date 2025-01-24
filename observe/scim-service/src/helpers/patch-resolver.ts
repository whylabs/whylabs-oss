import { ScimUser } from '../types';
import ScimGateway from 'scimgateway';

// internal representation of an attr to be added, replaced or deleted
type Item = { value: 'string'; type?: string; primary?: boolean | string; operation?: 'delete' };

/*
 * This code is taken from plugin-loki, with the minimum tweaks to make it typescript compatible. Currently this involves
 * a lot of nasty `as` assertions, for which I apologize.
 *
 * Its needed to support the complex plugin modifyUser logic, which includes:
 * - PUT has been converted into PATCH which then has to be converted back to a PUT
 * - PATCH is represented by attribute values + delete operations
 * - multi-value attributes can be converted from arrays to objects, or not
 * - other wrinkles that may not apply to us, and/or we may not be aware of!
 */

// TODO go thru all places where userObj gets assigned to and make sure
// we're actually changing the object rather than an added cast
export const patchResolver = (
  userObj: { [key: string]: unknown },
  attrObj: { [key: string]: unknown },
  scimGateway: typeof ScimGateway,
): ScimUser => {
  for (const key in attrObj) {
    if (Array.isArray(attrObj[key])) {
      // standard array of Item, not using type (e.g roles/groups) or skipTypeConvert=true
      const attrObjKeyArr = attrObj[key] as Item[];
      // standard, not using type (e.g roles/groups) or skipTypeConvert=true
      const delArr = attrObjKeyArr.filter((el) => el.operation === 'delete');
      const addArr = attrObjKeyArr.filter((el) => !el.operation || el.operation !== 'delete');
      if (!userObj[key]) userObj[key] = [];
      // delete
      userObj[key] = (userObj[key] as Item[]).filter((el) => {
        if (delArr.findIndex((e) => e.value === el.value) >= 0) return false;
        return true;
      });
      // add
      const userObjKeyArr = userObj[key] as Item[];
      addArr.forEach((el) => {
        if (Object.prototype.hasOwnProperty.call(el, 'primary')) {
          if (el.primary === true || (typeof el.primary === 'string' && el.primary.toLowerCase() === 'true')) {
            const index = userObjKeyArr.findIndex((e) => e.primary === el.primary);
            if (index >= 0) {
              if (key === 'roles') userObjKeyArr.splice(index, 1);
              // roles, delete existing role having primary attribute true (new role with primary will be added)
              else userObjKeyArr[index].primary = undefined; // remove primary attribute, only one primary
            }
          }
        }
        userObjKeyArr.push(el);
      });
    } else if (scimGateway.isMultiValueTypes(key)) {
      // "type converted object" logic and original blank type having type "undefined"
      if (!attrObj[key]) delete userObj[key]; // blank or null
      for (const el in attrObj[key] as object | null) {
        const attrObjKeyDict = attrObj[key] as { [key: string]: Item };
        attrObjKeyDict[el].type = el;
        if (attrObjKeyDict[el].operation && attrObjKeyDict[el].operation === 'delete') {
          // delete multivalue
          let type: string | undefined = el;
          if (type === 'undefined') type = undefined;
          const filteredItems = (userObj[key] as Item[]).filter((e) => e.type !== type);
          if (filteredItems.length < 1) {
            delete userObj[key];
          } else {
            userObj[key] = filteredItems;
          }
        } else {
          // modify/create multivalue
          if (!userObj[key]) userObj[key] = [];
          const userObjKeyArr = userObj[key] as Item[]; // NOT guaranteed to be an array!
          if (attrObjKeyDict[el].primary) {
            // remove any existing primary attribute, should only have one primary set
            const primVal = attrObjKeyDict[el].primary;
            if (primVal === true || (typeof primVal === 'string' && primVal.toLowerCase() === 'true')) {
              const index = userObjKeyArr.findIndex((e) => e.primary === primVal);
              if (index >= 0) {
                userObjKeyArr[index].primary = undefined;
              }
            }
          }
          const found = userObjKeyArr.find((e, i) => {
            if (e.type === el || (!e.type && el === 'undefined')) {
              const attrObjValueObj = attrObjKeyDict[el] as { [key: string]: unknown };
              for (const k in attrObjValueObj) {
                const userObjValueObj = userObjKeyArr[i] as { [key: string]: unknown };
                userObjValueObj[k] = attrObjValueObj[k];
                if (k === 'type' && attrObjKeyDict[el][k] === 'undefined') delete attrObjKeyDict[i][k]; // don't store with type "undefined"
              }
              return true;
            } else return false;
          });
          if (attrObjKeyDict[el].type && attrObjKeyDict[el].type === 'undefined') delete attrObjKeyDict[el].type; // don't store with type "undefined"
          if (!found) userObjKeyArr.push(attrObjKeyDict[el]); // create
        }
      }
    } else {
      // None multi value attribute
      if (typeof attrObj[key] !== 'object' || attrObj[key] === null) {
        if (attrObj[key] === '' || attrObj[key] === null) delete userObj[key];
        else userObj[key] = attrObj[key];
      } else {
        // name.familyName=Bianchi
        if (!userObj[key]) userObj[key] = {}; // e.g name object does not exist
        const attrObjVal = attrObj[key] as { [key: string]: unknown };
        // const attrObjVal = attrObj[key] as { [key: string]: object | string | null | string[] | { value: string } };
        for (const sub in attrObjVal) {
          // attributes to be cleared located in meta.attributes eg: {"meta":{"attributes":["name.familyName","profileUrl","title"]}
          if (sub === 'attributes' && Array.isArray(attrObjVal[sub])) {
            const attrObjSubVal = attrObjVal[sub] as string[];
            attrObjSubVal.forEach((element) => {
              const arrSub = typeof element === 'string' ? element.split('.') : [];
              if (arrSub.length === 2) {
                if (typeof userObj[arrSub[0]] === 'object') {
                  const obj = userObj[arrSub[0]] as { [key: string]: unknown };
                  obj[arrSub[1]] = '';
                }
              } // e.g. name.familyName
              else userObj[element] = '';
            });
          } else {
            const userObjVal = userObj[key] as { [key: string]: unknown };
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (Object.prototype.hasOwnProperty.call(attrObjVal[sub], 'value') && attrObjVal[sub].value === '') {
              delete userObjVal[sub];
            }
            // object having blank value attribute e.g. {"manager": {"value": "",...}}
            else if (attrObjVal[sub] === '') delete userObjVal[sub];
            else {
              if (!userObj[key]) userObj[key] = {}; // may have been deleted by length check below
              userObjVal[sub] = attrObjVal[sub];
            }
            if (Object.keys(userObjVal).length < 1) delete userObj[key];
          }
        }
      }
    }
  }
  return userObj as unknown as ScimUser; // Trust me!!!
};
