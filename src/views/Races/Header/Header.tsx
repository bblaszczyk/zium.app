import { ArrowRightOnRectangleIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { useRef } from "react";
import { Button } from "../../../components/Button/Button";
import { Input } from "../../../components/Input/Input";
import { Logo } from "../../../components/Logo/Logo";
import { useHotkeysStack } from "../../../hooks/useHotkeysStack/useHotkeysStack";
import { useScopedHotkeys } from "../../../hooks/useScopedHotkeys/useScopedHotkeys";
import { logOut } from "../../../utils/extensionApi";
import styles from "./Header.module.scss";

export const HEADER_HEIGHT = 92;

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (newValue: string) => void;
  overwriteVisibleSeason?: () => void;
}
export const Header = ({ searchQuery, setSearchQuery, overwriteVisibleSeason }: HeaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey) {
      return;
    }

    overwriteVisibleSeason?.();
    e.preventDefault();
    const id = `top`;
    const $scrollToElement = document.getElementById(id);
    if ($scrollToElement == null) {
      return;
    }

    $scrollToElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const scope = useHotkeysStack(true, true);
  useScopedHotkeys("/", scope, () => inputRef.current?.focus(), { enableOnFormTags: false, preventDefault: true });

  return (
    <>
      <div className={styles.wrapper}>
        <a href="#top" onClick={onLogoClick} className={styles.logoLink} aria-label="Scroll to top">
          <Logo height={32} width={88} color={"var(--color-text-strong)"} aria-label="ZIUM logo" />
        </a>
        <div className={styles.rightContent}>
          <div className={styles.inputWrapper}>
            <Input
              isRounded
              placeholder="Search"
              icon={MagnifyingGlassIcon}
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              canClear
              ref={inputRef}
              shortcut="/"
            />
          </div>
          <Button variant="Tertiary" iconRight={ArrowRightOnRectangleIcon} onClick={logOut}>
            Log out
          </Button>
        </div>
      </div>
      <div className={styles.shadow} />
    </>
  );
};
