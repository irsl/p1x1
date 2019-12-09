export enum E {
    InvalidPasswordError = "Invalid password provided",
    InvalidCatalogError = "The catalog provided does not contain an info block about key derivation",
    NotImplementedError = "This method is not implemented",
    CatalogAlreadyExistsError = "Catalog already exists, you cannot create a new one on this location.",
    CatalogEmptyError = "Catalog seems to be empty. You may need to create a new one.",
    UnableToParseCatalogIndexError = "Unable to parse catalog index, it might be corrupt.",
    CatalogIsPasswordProtectedError = "This catalog is password protected, you cannot open it without credentials.",
    CorruptFileEntryHashInCatalogError = "File entry is corrupt in the catalog, hash is missing.",
    OperationNotSupportedError = "Operation is not supported.",
    InvalidCatalogOperationError = "Invalid catalog operation error.",
    FilterSyntaxErrorExclaimationMarkError = "Unexpected exclaimation mark character.",
    FilterSyntaxErrorColonSpace = "Unexpected colon character. Make sure it is not preceeded by any whitespace.",
    FilterExpressionSyntaxError = "Syntax error in filter expression; unexpected term found at the end.",
    EmptyParenthesesBlockFilterExpressionError = "Error in filter expression, empty block detected in parentheses.",
    MixedModeOfBooleanExpressionsIsNotSupportedInsideFilterExpressionsError = "Mixed usage of boolean expressions is not supported. Use parentheses to group logical expressions.",
    UnexpectedEndOfParenthesesBlockError = "Closing parenthesis missing from expression.",
    FilterExpressionUnexpectedEndOfMetaError = "Unexpected end of meta filter in the expression.",
    EqualitySignExpectedError = "Equality operator expected error.",
    InvalidFileSizeOperatorError = "Invalid filesize operator in the expression.",
    TagNameMissingError = "Tag's name is missing.",
    FilterExpressionUnexpectedEndOfIdError = "ID is missing from id filter",
    FilterExpressionUnexpectedEndOfDateFilterError = "Unexpected end of date filter",
    FileIsNotPartOfThisCatalog = "Internal error: File is not part of this catalog!",
    ErrorWhileLoadingVideo = "Unknown error while loading video: ",
    InvalidFileVersion = "Invalid file version, either url or key invalid"
}

export default class extends Error
{
    constructor(public errorCode: E, public underLyingError?: Error, public additionalInfo?: string)
    {
        super(errorCode.toString());
    }
}
