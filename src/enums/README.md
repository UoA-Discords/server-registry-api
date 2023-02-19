# src/enums

Contains "enums" for various attribute and bit fields used in the API.

Note that strictly speaking these are not enums, as Typescript's native implementation of enums is [suboptimal](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums), however they behave almost identically.

If you come across a case where these "fake" enums can't be used in place of a "real" enum, please raise an issue.
