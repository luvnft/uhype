import type { PortableTextBlock } from "@portabletext/types";
import groq from "groq";
import { sanity } from "./sanity";

export type FullCmsMarketMetadata = {
  marketId?: string | null;
  question?: string;
  description?: PortableTextBlock[];
  imageUrl?: string | null;
  referendumRef?: {
    chain?: "solana"
    referendumIndex?: number;
  };
  twitchStreamUrl?: string;
};
export type CmsMarketCardMetadata = {
  marketId?: string | null;
  question?: string;
  imageUrl?: string | null;
};

const fullFields = groq`{
  "marketId": market.marketId,
  question,
  description,
  "imageUrl": img.asset->url,
  referendumRef,
  twitchStreamUrl
}`;

const cardFields = groq`{
  "marketId": market.marketId,
  question,
  "imageUrl": img.asset->url,
}`;

export const getCmsFullMarketMetadataForMarket = async (
  marketId: string,
): Promise<FullCmsMarketMetadata | null> => {
  const data = await sanity.fetch<FullCmsMarketMetadata>(
    groq`*[_type == "marketMetadata" && market.marketId == ${marketId}]${fullFields}`,
  );

  return data?.[0];
};

export const getCmsFullMarketMetadataForMarkets = async (
  marketIds: number[],
): Promise<FullCmsMarketMetadata[]> => {
  const data = await sanity.fetch<FullCmsMarketMetadata[]>(
    groq`*[_type == "marketMetadata" && market.marketId in ${JSON.stringify(
      marketIds,
    )}]${fullFields}`,
  );

  return data;
};

export const getCmsMarketCardMetadataForAllMarkets = async (): Promise<
  CmsMarketCardMetadata[]
> => {
  const data = await sanity.fetch<FullCmsMarketMetadata[]>(
    groq`*[_type == "marketMetadata"]${cardFields}`,
  );

  return data;
};
