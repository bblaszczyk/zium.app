import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Key } from "ts-key-enum";
import { ChartBarIcon, MapIcon, TvIcon } from "@heroicons/react/24/outline";
import { StreamPickerDataState, useStreamPicker } from "../../hooks/useStreamPicker/useStreamPicker";
import { DriverData } from "../../views/Viewer/Viewer.utils";
import { Input } from "../Input/Input";
import { ListItem } from "../ListItem/ListItem";
import { Sheet } from "../Sheet/Sheet";
import { VideoFeedContent } from "../VideoFeedContent/VideoFeedContent";
import { useScopedHotkeys } from "../../hooks/useScopedHotkeys/useScopedHotkeys";
import { assertNever } from "../../utils/assertNever";
import { StreamInfo } from "../../hooks/useVideoRaceDetails/useVideoRaceDetails.types";
import { isNotNullable } from "../../utils/usNotNullable";
import { useHotkeysStack } from "../../hooks/useHotkeysStack/useHotkeysStack";
import styles from "./StreamPicker.module.scss";
import { StreamPickerEntry } from "./StreamPicker.types";

interface StreamPickerProps {
  availableDrivers: DriverData[];
  globalFeeds: Array<StreamInfo | null>;
}
export const StreamPicker = ({ availableDrivers, globalFeeds }: StreamPickerProps) => {
  const { state, onCancel, onChoice } = useStreamPicker();
  const { data: laggedState, reset: resetLaggedState } = useLaggedBehinedStreamPickerDataState(state);
  const [searchText, setSearchText] = useState("");
  const [fakeSelection, setFakeSelection] = useState<number>(0);
  const listItemsRefs = useRef<(HTMLElement | null)[]>([]);

  const streamPickerEntries: StreamPickerEntry[] = useMemo(() => {
    const globalEntries = globalFeeds.filter(isNotNullable).map(
      (streamInfo): StreamPickerEntry => ({
        id: streamInfo.type,
        type: "global",
        streamInfo,
      }),
    );

    const driverEntries = availableDrivers.map(
      (driver): StreamPickerEntry => ({
        id: driver.id,
        type: "driver",
        driver,
      }),
    );

    const allEntries = [...globalEntries, ...driverEntries];

    const hiddenEntries = laggedState.isOpen ? laggedState.hiddenEntries : [];
    const pickerType = laggedState.isOpen ? laggedState.pickerType : "all";

    const filteredEntires = allEntries.filter((entry) => {
      if (pickerType === "drivers" && entry.type !== "driver") {
        return false;
      }

      const isHiddenEntry = hiddenEntries.includes(entry.id);

      if (isHiddenEntry) {
        return false;
      }

      if (searchText === "") {
        return true;
      }

      if (entry.type === "driver") {
        const driver = entry.driver;
        return includes(`${driver.lastName} ${driver.firstName}`, searchText);
      }

      if (entry.type === "global") {
        const streamInfo = entry.streamInfo;
        return includes(streamInfo.title, searchText);
      }

      return assertNever(entry);
    });

    return filteredEntires;
  }, [availableDrivers, globalFeeds, searchText, laggedState]);

  const onClosed = () => {
    setSearchText("");
    setFakeSelection(0);
    resetLaggedState();
  };

  const onArrowDown = useCallback(() => {
    setFakeSelection((fs) => loopSelection(fs + 1, streamPickerEntries.length - 1));
  }, [streamPickerEntries.length]);
  const onArrowUp = useCallback(() => {
    setFakeSelection((fs) => loopSelection(fs - 1, streamPickerEntries.length - 1));
  }, [streamPickerEntries.length]);
  const onEnter = useCallback(() => {
    const selectedEntry = streamPickerEntries[fakeSelection];

    if (selectedEntry) {
      onChoice(selectedEntry.id, selectedEntry.type);
    }

    return;
  }, [fakeSelection, streamPickerEntries, onChoice]);

  const scope = useHotkeysStack(state.isOpen, false);
  const commonOptions = { enableOnFormTags: true };
  useScopedHotkeys(Key.Escape, scope, onCancel, commonOptions);
  useScopedHotkeys(Key.ArrowDown, scope, onArrowDown, commonOptions);
  useScopedHotkeys(Key.ArrowUp, scope, onArrowUp, commonOptions);
  useScopedHotkeys(Key.Enter, scope, onEnter, commonOptions);

  useEffect(() => {
    listItemsRefs.current[fakeSelection]?.scrollIntoView({ block: "nearest" });
  }, [fakeSelection]);

  return (
    <Sheet isOpen={state.isOpen} onClose={onCancel} initialFocus onClosed={onClosed} wrapperClassName={styles.sheet}>
      <div className={styles.wrapper}>
        <div className={styles.inputWrapper}>
          <Input
            icon={MagnifyingGlassIcon}
            placeholder="Search"
            type="text"
            onChange={(e) => {
              setSearchText(e.target.value);
              setFakeSelection(0);
            }}
            value={searchText}
          />
        </div>

        <div className={styles.streamsWrapper}>
          {streamPickerEntries.map((entry, i) => {
            if (entry.type === "driver") {
              const driver = entry.driver;

              return (
                <ListItem
                  tabIndex={-1}
                  key={driver.id}
                  onClick={() => onChoice(driver.id, "driver")}
                  isActive={fakeSelection === i}
                  onMouseEnter={() => setFakeSelection(i)}
                  ref={(ref) => {
                    listItemsRefs.current[i] = ref;
                  }}
                >
                  <VideoFeedContent label={driver.lastName} topLabel={driver.firstName} srcList={driver.imageUrls} />
                </ListItem>
              );
            }

            if (entry.type === "global") {
              const stream = entry.streamInfo;

              return (
                <ListItem
                  tabIndex={-1}
                  key={stream.type}
                  onClick={() => onChoice(stream.type, "global")}
                  isActive={fakeSelection === i}
                  onMouseEnter={() => setFakeSelection(i)}
                  ref={(ref) => {
                    listItemsRefs.current[i] = ref;
                  }}
                >
                  <VideoFeedContent label={stream.title} icon={getIconForStreamInfo(stream)} />
                </ListItem>
              );
            }

            return assertNever(entry);
          })}
        </div>
      </div>
    </Sheet>
  );
};

function includes(a: string, b: string) {
  return a.toLocaleLowerCase().includes(b.toLocaleLowerCase());
}

function loopSelection(n: number, max: number) {
  if (n < 0) {
    return max;
  }

  if (n > max) {
    return 0;
  }

  return n;
}

const getIconForStreamInfo = (streamInfo: StreamInfo) => {
  switch (streamInfo.type) {
    case "main":
      return TvIcon;
    case "data-channel":
      return ChartBarIcon;
    case "driver-tracker":
      return MapIcon;
    case "other":
      return TvIcon;
  }

  return assertNever(streamInfo.type);
};

const useLaggedBehinedStreamPickerDataState = (streamPickerDataState: StreamPickerDataState) => {
  const [laggedBehindState, setLaggedBehindState] = useState(streamPickerDataState);
  useEffect(() => {
    if (streamPickerDataState.isOpen) {
      setLaggedBehindState(streamPickerDataState);
    }
  }, [streamPickerDataState]);

  const reset = () => setLaggedBehindState(streamPickerDataState);

  const data = streamPickerDataState.isOpen ? streamPickerDataState : laggedBehindState;

  return { data, reset };
};
