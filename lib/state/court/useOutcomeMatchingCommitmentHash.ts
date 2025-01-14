import { u8aToHex } from "@polkadot/util";
import { HexString } from "@polkadot/util/types";
import { CategoricalAssetId, isRpcSdk } from "@zeitgeistpm/sdk";
import { useSdkv2 } from "lib/hooks/useSdkv2";
import { CourtSalt } from "lib/state/court/useCourtSalt";
import { useWallet } from "@solana/wallet-adapter-react";
import { createCourtCommitmentHash } from "lib/util/create-vote-commitment-hash";

/**
 * Find a matching outcome for a commitment hash.
 * Helpful so that we can restore state from backup or partially missing local state.
 */
export const useOutcomeMatchingCommitmentHash = (
  salt: CourtSalt,
  commitmentHash: HexString,
  outcomeAssets: CategoricalAssetId[],
) => {
  const [sdk] = useSdkv2();
  const { publicKey } = useWallet();
  const pubKey = publicKey?.toString() ?? "";
  if (isRpcSdk(sdk) && publicKey) {
    const outcome = outcomeAssets.find((assetId) => {
      const assetHash = createCourtCommitmentHash(
        sdk,
        pubKey!,
        assetId,
        salt,
      );
      return u8aToHex(assetHash) === commitmentHash;
    });

    return outcome;
  }
};
