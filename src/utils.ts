export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * A generic binary search function to find an index in a sorted array
 * based on a custom comparison function.
 *
 * @param array - The sorted array to search within.
 * @param comparator - A function that compares the target position with the current item in the array.
 *                     Should return:
 *                     - A negative number if the target is less than the current item.
 *                     - Zero if the target matches the current item.
 *                     - A positive number if the target is greater than the current item.
 * @returns The index of the matched item, or -1 if not found.
 */
export const binarySearch = <T>(array: T[], comparator: (item: T) => number): number => {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const mid = (left + right) >>> 1;
    const comparison = comparator(array[mid]);

    if (comparison < 0) {
      right = mid - 1;
    } else if (comparison > 0) {
      left = mid + 1;
    } else {
      return mid;
    }
  }

  return -1; // Not found
};
