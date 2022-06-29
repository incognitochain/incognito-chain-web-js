import capitalize from "lodash/capitalize";

export const capitalizeKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((v) => capitalizeKeys(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [capitalize(key)]: capitalizeKeys(obj[key]),
      }),
      {}
    );
  }
  return obj;
};
