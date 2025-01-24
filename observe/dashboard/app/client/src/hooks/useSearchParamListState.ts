import { decodeObject, encodeObject } from '~/utils/uriUtils';
import { setEncodedObjectForSearchParamKey } from '~/utils/urlParamsUtils';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UseSearchParamListStateProps<T> = {
  initialList?: T[];
  mustHaveEmptyObject?: T;
  paramKey: string;
};

type UseSearchParamListStateReturnType<T> = {
  deleteItem: (item: T) => void;
  getList: () => T[];
  setItem: (item: T) => void;
  updateItem: (item: T) => void;
};

export function useSearchParamListState<T extends { id: string }>({
  initialList,
  mustHaveEmptyObject,
  paramKey,
}: UseSearchParamListStateProps<T>): UseSearchParamListStateReturnType<T> {
  const [searchParam, setSearchParam] = useSearchParams();

  useEffect(() => {
    // If there are items in the search param, do nothing
    if (searchParam.getAll(paramKey).length) return;

    // If there is an initial list, add the initial list to the search param
    if (initialList?.length) {
      setSearchParam(
        (nextSearchParam) => {
          initialList.forEach((item) => {
            setEncodedObjectForSearchParamKey(paramKey, item, nextSearchParam);
          });
          return nextSearchParam;
        },
        { replace: true },
      );
    } else if (mustHaveEmptyObject) {
      // If can't be a empty list, add the empty object to the search param
      setSearchParam(
        (nextSearchParam) => {
          return setEncodedObjectForSearchParamKey(paramKey, mustHaveEmptyObject, nextSearchParam);
        },
        { replace: true },
      );
    }
    // Must only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    deleteItem,
    getList,
    setItem,
    updateItem,
  };

  function deleteItem(item: T) {
    setSearchParam((nextSearchParam) => {
      const itemsList = getList();
      const newList = itemsList.filter((c) => c.id !== item.id);

      nextSearchParam.delete(paramKey);
      if (mustHaveEmptyObject && !newList.length) {
        nextSearchParam.append(paramKey, encodeObject(mustHaveEmptyObject));
      } else {
        newList.forEach((c) => {
          nextSearchParam.append(paramKey, encodeObject(c));
        });
      }

      return nextSearchParam;
    });
  }

  function setItem(item: T) {
    setSearchParam((nextSearchParam) => {
      return setEncodedObjectForSearchParamKey(paramKey, item, nextSearchParam);
    });
  }

  function updateItem(item: T) {
    setSearchParam((nextSearchParam) => {
      const itemsList = getList();
      const newList = itemsList.map((current) => (current.id === item.id ? item : current));
      nextSearchParam.delete(paramKey);
      newList.forEach((c) => {
        nextSearchParam.append(paramKey, encodeObject(c));
      });
      return nextSearchParam;
    });
  }

  function getList(): T[] {
    const itemsString = searchParam.getAll(paramKey);
    return itemsString.map(decodeObject<T>);
  }
}
