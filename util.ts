const discordEpoch = 1420070400000;

export function convertSnowflakeIdToTimestamp(snowflake: string) {
    const snowflakeAsBigInt = BigInt(snowflake)
    const id = BigInt.asUintN(64, snowflakeAsBigInt);
    const dateBits = Number(id >> 22n);

    // const date = new Date(dateBits + discordEpoch);
    const unix = (dateBits + discordEpoch);
    return unix;
}