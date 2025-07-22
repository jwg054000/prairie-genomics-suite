#!/usr/bin/env python3
"""
🧬 Prairie Genomics Suite - Enhanced Edition
Advanced Genomics Analysis Platform

A comprehensive, publication-ready genomics analysis platform that rivals commercial solutions.
Features include differential expression analysis, survival analysis, pathway enrichment,
literature search, and publication-quality visualizations.

Usage:
    streamlit run prairie_genomics_enhanced.py

Author: Prairie Genomics Team
Version: 2.0.0
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import seaborn as sns
import matplotlib.pyplot as plt
import warnings
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Handle Streamlit version compatibility
def safe_rerun():
    """Safe rerun function that works with different Streamlit versions"""
    try:
        st.rerun()
    except AttributeError:
        try:
            st.experimental_rerun()
        except AttributeError:
            # Fallback - just show a message
            st.info("Please refresh the page to see the changes")

# Add utils to path
sys.path.append(str(Path(__file__).parent / "utils"))

# Import our utility modules
try:
    from gene_conversion import GeneConverter
    from deseq2_wrapper import DESeq2Wrapper
    from edger_wrapper import EdgeRWrapper
    from survival_analysis import SurvivalAnalyzer
    from pathway_analysis import PathwayAnalyzer
    from pubmed_search import PubMedSearcher
    from visualization_export import VisualizationExporter
except ImportError as e:
    st.error(f"Failed to import utility modules: {e}")
    st.error("Please ensure all utility modules are properly installed.")
    st.stop()

warnings.filterwarnings('ignore')

# Configure Streamlit page
st.set_page_config(
    page_title="🧬 Prairie Genomics Suite - Enhanced",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for professional appearance
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #2E86AB;
        text-align: center;
        margin-bottom: 1rem;
        font-weight: bold;
    }
    .sub-header {
        font-size: 1.5rem;
        color: #A23B72;
        margin: 1rem 0;
        font-weight: 600;
    }
    .metric-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin: 0.5rem 0;
    }
    .success-box {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        margin: 1rem 0;
    }
    .info-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        margin: 1rem 0;
    }
    .warning-box {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        margin: 1rem 0;
    }
    .stTab > div > div > div > div {
        padding: 2rem 1rem;
    }
    .sidebar .sidebar-content {
        background: linear-gradient(180deg, #2E86AB, #A23B72);
        color: white;
    }
</style>
""", unsafe_allow_html=True)

class PrairieGenomicsEnhanced:
    """
    Main application class for the enhanced Prairie Genomics Suite
    """
    
    def __init__(self):
        """Initialize the application with all components"""
        self.initialize_session_state()
        self.initialize_components()
    
    def initialize_session_state(self):
        """Initialize Streamlit session state variables"""
        default_states = {
            'expression_data': None,
            'clinical_data': None,
            'gene_symbols': {},
            'de_results': None,
            'pathway_results': None,
            'survival_results': None,
            'literature_results': None,
            'current_project': None,
            'analysis_history': [],
            'export_ready': False
        }
        
        for key, default_value in default_states.items():
            if key not in st.session_state:
                st.session_state[key] = default_value
    
    def initialize_components(self):
        """Initialize analysis components"""
        self.gene_converter = GeneConverter()
        self.deseq2 = DESeq2Wrapper()
        self.edger = EdgeRWrapper()
        self.survival_analyzer = SurvivalAnalyzer()
        self.pathway_analyzer = PathwayAnalyzer()
        self.pubmed_searcher = PubMedSearcher()
        self.viz_exporter = VisualizationExporter()
    
    def show_header(self):
        """Display main header and navigation"""
        st.markdown('<h1 class="main-header">🧬 Prairie Genomics Suite - Enhanced</h1>', 
                   unsafe_allow_html=True)
        st.markdown(
            '<p style="text-align: center; font-size: 1.2rem; color: #666; margin-bottom: 2rem;">'
            'Publication-Ready Genomics Analysis Platform</p>', 
            unsafe_allow_html=True
        )
        
        # Main navigation tabs
        tabs = st.tabs([
            "📊 Data Import", 
            "🔄 Gene Conversion", 
            "🧬 Differential Expression",
            "📈 Survival Analysis",
            "🔬 Pathway Analysis",
            "📚 Literature Search",
            "📊 Advanced Visualizations",
            "💾 Export & Results",
            "⚙️ Settings"
        ])
        
        return tabs
    
    def data_import_section(self, tab):
        """Enhanced data import and preprocessing"""
        with tab:
            st.markdown('<h2 class="sub-header">📊 Data Import & Quality Control</h2>', 
                       unsafe_allow_html=True)
            
            # Data source selection
            col1, col2 = st.columns([2, 1])
            
            with col1:
                data_source = st.selectbox(
                    "Select data source:",
                    ["Upload Files", "TCGA Data Portal", "GEO Database", "Example Dataset"],
                    help="Choose your data source"
                )
            
            with col2:
                file_format = st.selectbox(
                    "File format:",
                    ["CSV", "TSV", "Excel", "H5", "Feather"],
                    help="Select file format"
                )
            
            if data_source == "Upload Files":
                self.handle_file_upload(file_format)
            elif data_source == "Example Dataset":
                self.load_example_data()
            else:
                st.info(f"{data_source} integration coming in next update!")
            
            # Data quality control
            if st.session_state.expression_data is not None:
                self.show_data_quality_control()
    
    def handle_file_upload(self, file_format):
        """Handle file upload with validation"""
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Expression Data")
            expression_file = st.file_uploader(
                "Upload expression matrix",
                type=['csv', 'tsv', 'xlsx'],
                help="Genes as rows, samples as columns"
            )
            
            if expression_file:
                try:
                    if file_format == "CSV":
                        df = pd.read_csv(expression_file, index_col=0)
                    elif file_format == "TSV":
                        df = pd.read_csv(expression_file, sep='\t', index_col=0)
                    elif file_format == "Excel":
                        df = pd.read_excel(expression_file, index_col=0)
                    
                    st.session_state.expression_data = df
                    st.success(f"✅ Loaded {df.shape[0]} genes × {df.shape[1]} samples")
                    
                except Exception as e:
                    st.error(f"Error loading expression data: {str(e)}")
        
        with col2:
            st.subheader("Clinical Data (Optional)")
            clinical_file = st.file_uploader(
                "Upload clinical metadata",
                type=['csv', 'tsv', 'xlsx'],
                help="Sample metadata and clinical variables"
            )
            
            if clinical_file:
                try:
                    if file_format == "CSV":
                        df = pd.read_csv(clinical_file)
                    elif file_format == "TSV":
                        df = pd.read_csv(clinical_file, sep='\t')
                    elif file_format == "Excel":
                        df = pd.read_excel(clinical_file)
                    
                    st.session_state.clinical_data = df
                    st.success(f"✅ Loaded clinical data for {len(df)} samples")
                    
                except Exception as e:
                    st.error(f"Error loading clinical data: {str(e)}")
    
    def load_example_data(self):
        """Load example TCGA PAAD dataset"""
        if st.button("🧬 Load TCGA PAAD Example Dataset", type="primary"):
            with st.spinner("Loading example dataset..."):
                try:
                    # Generate synthetic TCGA-like data
                    np.random.seed(42)
                    n_genes, n_samples = 2000, 150
                    
                    # Create gene names (Ensembl-like IDs)
                    genes = [f"ENSG{i:08d}.{np.random.randint(1,10)}" for i in range(n_genes)]
                    samples = [f"TCGA-{chr(65+i//26)}{chr(65+i%26)}-{j:04d}" 
                              for i in range(n_samples) for j in range(1) if len(samples) < n_samples][:n_samples]
                    
                    # Generate expression data
                    base_expr = np.random.lognormal(mean=5, sigma=2, size=(n_genes, n_samples))
                    
                    # Add some differentially expressed genes
                    de_genes = np.random.choice(n_genes, 200, replace=False)
                    for gene_idx in de_genes:
                        effect_size = np.random.uniform(-3, 3)
                        treatment_samples = np.random.choice(n_samples, n_samples//2, replace=False)
                        base_expr[gene_idx, treatment_samples] *= np.exp(effect_size)
                    
                    expression_df = pd.DataFrame(base_expr, index=genes, columns=samples)
                    st.session_state.expression_data = expression_df
                    
                    # Generate clinical data
                    clinical_data = pd.DataFrame({
                        'sample_id': samples,
                        'age': np.random.normal(65, 10, n_samples),
                        'gender': np.random.choice(['Male', 'Female'], n_samples),
                        'stage': np.random.choice(['I', 'II', 'III', 'IV'], n_samples, p=[0.1, 0.3, 0.4, 0.2]),
                        'overall_survival_days': np.random.exponential(500, n_samples),
                        'vital_status': np.random.choice([0, 1], n_samples, p=[0.6, 0.4]),
                        'treatment_response': np.random.choice(['Complete', 'Partial', 'Stable', 'Progressive'], n_samples),
                        'mutation_count': np.random.poisson(50, n_samples)
                    })
                    st.session_state.clinical_data = clinical_data
                    
                    st.success("✅ Example TCGA PAAD dataset loaded successfully!")
                    
                except Exception as e:
                    st.error(f"Error loading example data: {str(e)}")
    
    def show_data_quality_control(self):
        """Display data quality control metrics"""
        st.subheader("📊 Data Quality Control")
        
        expr_data = st.session_state.expression_data
        
        # Basic statistics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Genes", f"{expr_data.shape[0]:,}")
        with col2:
            st.metric("Total Samples", f"{expr_data.shape[1]:,}")
        with col3:
            missing_pct = (expr_data.isnull().sum().sum() / expr_data.size) * 100
            st.metric("Missing Values", f"{missing_pct:.1f}%")
        with col4:
            zero_pct = ((expr_data == 0).sum().sum() / expr_data.size) * 100
            st.metric("Zero Values", f"{zero_pct:.1f}%")
        
        # Quality control options
        with st.expander("🔧 Quality Control Options"):
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("Gene Filtering")
                min_expression = st.number_input("Minimum expression level", 0.0, 10.0, 1.0)
                min_samples = st.number_input("Minimum samples expressed", 1, expr_data.shape[1]//2, 10)
                
                if st.button("Apply Gene Filtering"):
                    mask = (expr_data > min_expression).sum(axis=1) >= min_samples
                    filtered_data = expr_data[mask]
                    st.session_state.expression_data = filtered_data
                    st.success(f"Filtered to {filtered_data.shape[0]} genes")
                    st.rerun()
            
            with col2:
                st.subheader("Normalization")
                norm_method = st.selectbox(
                    "Normalization method:",
                    ["None", "Log2", "TPM", "CPM", "Z-score"]
                )
                
                if st.button("Apply Normalization") and norm_method != "None":
                    if norm_method == "Log2":
                        normalized = np.log2(expr_data + 1)
                    elif norm_method == "Z-score":
                        normalized = (expr_data - expr_data.mean()) / expr_data.std()
                    else:
                        st.info(f"{norm_method} normalization coming soon!")
                        normalized = expr_data
                    
                    st.session_state.expression_data = normalized
                    st.success(f"Applied {norm_method} normalization")
                    st.rerun()
        
        # Data preview
        with st.expander("👀 Data Preview"):
            preview_tab1, preview_tab2 = st.tabs(["Expression Data", "Clinical Data"])
            
            with preview_tab1:
                st.dataframe(expr_data.head(10), use_container_width=True)
            
            with preview_tab2:
                if st.session_state.clinical_data is not None:
                    st.dataframe(st.session_state.clinical_data.head(10), use_container_width=True)
                else:
                    st.info("No clinical data loaded")
    
    def gene_conversion_section(self, tab):
        """Enhanced gene ID conversion"""
        with tab:
            st.markdown('<h2 class="sub-header">🔄 Gene ID Conversion</h2>', 
                       unsafe_allow_html=True)
            
            if st.session_state.expression_data is None:
                st.warning("⚠️ Please import expression data first!")
                return
            
            # Conversion options
            col1, col2, col3 = st.columns(3)
            
            with col1:
                from_type = st.selectbox(
                    "Source ID type:",
                    ["ensembl.gene", "entrezgene", "refseq", "symbol"],
                    help="Current gene ID format"
                )
            
            with col2:
                to_type = st.selectbox(
                    "Target ID type:",
                    ["symbol", "name", "ensembl.gene", "entrezgene"],
                    help="Desired gene ID format"
                )
            
            with col3:
                max_genes = st.number_input(
                    "Max genes to convert:",
                    100, 5000, 1000,
                    help="Limit for API rate limiting"
                )
            
            # Advanced options
            with st.expander("🔧 Advanced Options"):
                species = st.selectbox("Species:", ["human", "mouse", "rat"])
                use_cache = st.checkbox("Use cached results", True, 
                                      help="Use previously cached conversions",
                                      key="gene_conversion_use_cache")
                batch_size = st.slider("Batch size:", 10, 100, 50,
                                     help="Number of genes per API request")
            
            # Convert genes
            if st.button("🚀 Start Gene Conversion", type="primary"):
                with st.spinner("Converting gene IDs..."):
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    
                    def progress_callback(message, progress):
                        progress_bar.progress(progress / 100)
                        status_text.text(message)
                    
                    try:
                        # Get top variable genes
                        gene_vars = st.session_state.expression_data.var(axis=1).sort_values(ascending=False)
                        top_genes = gene_vars.head(max_genes).index.tolist()
                        
                        # Convert genes
                        conversions = self.gene_converter.convert_genes(
                            top_genes,
                            from_type=from_type,
                            to_type=to_type,
                            species=species,
                            progress_callback=progress_callback
                        )
                        
                        st.session_state.gene_symbols = conversions
                        
                        # Show results
                        st.success(f"✅ Successfully converted {len(conversions)} genes!")
                        
                        # Display sample conversions
                        if conversions:
                            st.subheader("📋 Conversion Results")
                            sample_df = pd.DataFrame([
                                {"Original ID": k, "Converted": v}
                                for k, v in list(conversions.items())[:20]
                            ])
                            st.dataframe(sample_df, use_container_width=True)
                            
                            # Conversion statistics
                            col1, col2, col3 = st.columns(3)
                            with col1:
                                st.metric("Genes Converted", len(conversions))
                            with col2:
                                success_rate = (len(conversions) / len(top_genes)) * 100
                                st.metric("Success Rate", f"{success_rate:.1f}%")
                            with col3:
                                unique_symbols = len(set(conversions.values()))
                                st.metric("Unique Symbols", unique_symbols)
                    
                    except Exception as e:
                        st.error(f"❌ Gene conversion failed: {str(e)}")
            
            # Show current status
            if st.session_state.gene_symbols:
                with st.container():
                    st.markdown('<div class="success-box">', unsafe_allow_html=True)
                    st.write(f"✅ **{len(st.session_state.gene_symbols)} genes converted**")
                    st.write("Ready for downstream analysis!")
                    st.markdown('</div>', unsafe_allow_html=True)
                
                # Clear cache option
                if st.button("🗑️ Clear Conversion Cache"):
                    self.gene_converter.clear_cache()
                    st.success("Cache cleared!")
    
    def differential_expression_section(self, tab):
        """Enhanced differential expression analysis"""
        with tab:
            st.markdown('<h2 class="sub-header">🧬 Differential Expression Analysis</h2>', 
                       unsafe_allow_html=True)
            
            if st.session_state.expression_data is None:
                st.warning("⚠️ Please import expression data first!")
                return
            
            # Analysis method selection
            method = st.selectbox(
                "Analysis method:",
                ["DESeq2", "edgeR", "limma-voom", "t-test"],
                help="Statistical method for differential expression"
            )
            
            # Experimental design
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("🎯 Experimental Design")
                
                if st.session_state.clinical_data is not None:
                    # Use clinical data for grouping
                    clinical_cols = st.session_state.clinical_data.columns.tolist()
                    group_column = st.selectbox("Grouping variable:", clinical_cols)
                    
                    if group_column:
                        unique_groups = st.session_state.clinical_data[group_column].unique()
                        st.write(f"Groups found: {', '.join(map(str, unique_groups))}")
                        
                        if len(unique_groups) == 2:
                            contrast = st.selectbox("Comparison:", 
                                                   [f"{unique_groups[1]} vs {unique_groups[0]}"])
                        else:
                            st.info("Multi-group comparison - will use ANOVA-like approach")
                else:
                    # Manual grouping
                    st.info("No clinical data available. Using expression-based grouping.")
                    target_gene = st.text_input("Target gene for grouping:", value="TCN1")
                    grouping_method = st.selectbox(
                        "Grouping method:",
                        ["Median split", "Quartile split", "Tertile split"]
                    )
            
            with col2:
                st.subheader("⚙️ Analysis Parameters")
                
                p_threshold = st.number_input(
                    "P-value threshold:",
                    0.001, 0.1, 0.05, 0.001,
                    format="%.3f"
                )
                
                fc_threshold = st.number_input(
                    "Log2 fold change threshold:",
                    0.1, 5.0, 1.0, 0.1,
                    format="%.1f"
                )
                
                multiple_testing = st.selectbox(
                    "Multiple testing correction:",
                    ["Benjamini-Hochberg", "Bonferroni", "Holm"]
                )
                
                # Advanced parameters
                with st.expander("🔧 Advanced Parameters"):
                    if method == "DESeq2":
                        fit_type = st.selectbox("Fit type:", ["parametric", "local", "mean"])
                        size_factors = st.checkbox("Auto size factors", True, 
                                                   key="deseq2_auto_size_factors")
                    elif method == "edgeR":
                        norm_method = st.selectbox("Normalization:", ["TMM", "RLE", "upperquartile"])
                        dispersion = st.selectbox("Dispersion:", ["tagwise", "common", "trended"])
            
            # Run analysis
            if st.button("🚀 Run Differential Expression Analysis", type="primary"):
                with st.spinner("Running differential expression analysis..."):
                    try:
                        # Prepare data
                        if st.session_state.clinical_data is not None and 'group_column' in locals():
                            # Use clinical grouping
                            design_matrix = st.session_state.clinical_data.set_index('sample_id')
                            
                            # Align with expression data
                            common_samples = design_matrix.index.intersection(
                                st.session_state.expression_data.columns
                            )
                            
                            expr_subset = st.session_state.expression_data[common_samples]
                            design_subset = design_matrix.loc[common_samples]
                            
                        else:
                            # Expression-based grouping
                            expr_subset = st.session_state.expression_data
                            design_subset = self.create_expression_groups(
                                expr_subset, target_gene, grouping_method
                            )
                        
                        # Run selected method
                        if method == "DESeq2":
                            results = self.deseq2.run_deseq2(
                                expr_subset.astype(int),  # DESeq2 needs integer counts
                                design_subset,
                                fit_type=fit_type if 'fit_type' in locals() else "parametric"
                            )
                        elif method == "edgeR":
                            results = self.edger.run_edger(
                                expr_subset.astype(int),
                                design_subset,
                                normalize_method=norm_method if 'norm_method' in locals() else "TMM"
                            )
                        else:
                            # Fallback to t-test
                            results = self.run_simple_differential_expression(
                                expr_subset, design_subset
                            )
                        
                        # Add gene symbols
                        if st.session_state.gene_symbols:
                            results['gene_symbol'] = results.index.map(
                                lambda x: st.session_state.gene_symbols.get(
                                    x.split('.')[0], x.split('.')[0]
                                )
                            )
                        
                        st.session_state.de_results = results
                        
                        # Show results summary
                        significant = results[
                            (results['padj'] < p_threshold) & 
                            (np.abs(results['log2FoldChange']) > fc_threshold)
                        ]
                        
                        st.success(f"✅ Analysis complete! Found {len(significant)} significant genes")
                        
                        # Results metrics
                        col1, col2, col3, col4 = st.columns(4)
                        with col1:
                            st.metric("Total Genes", len(results))
                        with col2:
                            up_genes = len(significant[significant['log2FoldChange'] > 0])
                            st.metric("Up-regulated", up_genes)
                        with col3:
                            down_genes = len(significant[significant['log2FoldChange'] < 0])
                            st.metric("Down-regulated", down_genes)
                        with col4:
                            st.metric("Significant Total", len(significant))
                        
                        # Top results preview
                        if len(significant) > 0:
                            st.subheader("🔝 Top Significant Genes")
                            top_results = significant.nsmallest(10, 'padj')
                            display_cols = ['gene_symbol', 'log2FoldChange', 'padj'] if 'gene_symbol' in top_results.columns else ['log2FoldChange', 'padj']
                            st.dataframe(top_results[display_cols], use_container_width=True)
                    
                    except Exception as e:
                        st.error(f"❌ Analysis failed: {str(e)}")
                        st.info("💡 Try adjusting parameters or checking data format")
            
            # Show current results status
            if st.session_state.de_results is not None:
                with st.container():
                    st.markdown('<div class="success-box">', unsafe_allow_html=True)
                    sig_count = len(st.session_state.de_results[
                        (st.session_state.de_results['padj'] < 0.05) & 
                        (np.abs(st.session_state.de_results['log2FoldChange']) > 1.0)
                    ])
                    st.write(f"✅ **Analysis Results Available**")
                    st.write(f"🎯 {sig_count} significant genes identified")
                    st.write("Ready for visualization and downstream analysis!")
                    st.markdown('</div>', unsafe_allow_html=True)
    
    def create_expression_groups(self, expression_data, target_gene, method):
        """Create sample groups based on target gene expression"""
        # Find target gene
        gene_id = None
        if st.session_state.gene_symbols:
            for gid, symbol in st.session_state.gene_symbols.items():
                if symbol.upper() == target_gene.upper():
                    for expr_id in expression_data.index:
                        if gid in expr_id:
                            gene_id = expr_id
                            break
                    if gene_id:
                        break
        
        if gene_id is None:
            # Try partial match
            for expr_id in expression_data.index:
                if target_gene.upper() in expr_id.upper():
                    gene_id = expr_id
                    break
        
        if gene_id is None:
            raise ValueError(f"Gene {target_gene} not found in expression data")
        
        # Get expression values
        gene_expr = expression_data.loc[gene_id]
        
        # Create groups
        if method == "Median split":
            threshold = gene_expr.median()
            groups = np.where(gene_expr >= threshold, "High", "Low")
        elif method == "Quartile split":
            q75, q25 = gene_expr.quantile([0.75, 0.25])
            groups = []
            for val in gene_expr:
                if val >= q75:
                    groups.append("High")
                elif val <= q25:
                    groups.append("Low")
                else:
                    groups.append("Medium")
        elif method == "Tertile split":
            q67, q33 = gene_expr.quantile([0.67, 0.33])
            groups = []
            for val in gene_expr:
                if val >= q67:
                    groups.append("High")
                elif val <= q33:
                    groups.append("Low")
                else:
                    groups.append("Medium")
        
        # Create design matrix
        design_df = pd.DataFrame({
            'sample_id': gene_expr.index,
            'condition': groups
        }).set_index('sample_id')
        
        return design_df
    
    def run_simple_differential_expression(self, expression_data, design_matrix):
        """Simple t-test based differential expression"""
        from scipy.stats import ttest_ind
        from statsmodels.stats.multitest import multipletests
        
        results = []
        
        # Get groups
        groups = design_matrix['condition'].unique()
        if len(groups) != 2:
            raise ValueError("Simple DE requires exactly 2 groups")
        
        group1_samples = design_matrix[design_matrix['condition'] == groups[0]].index
        group2_samples = design_matrix[design_matrix['condition'] == groups[1]].index
        
        for gene in expression_data.index:
            expr1 = expression_data.loc[gene, group1_samples]
            expr2 = expression_data.loc[gene, group2_samples]
            
            # Log transform
            log_expr1 = np.log2(expr1 + 1)
            log_expr2 = np.log2(expr2 + 1)
            
            # T-test
            stat, pval = ttest_ind(log_expr2, log_expr1)
            
            # Log2 fold change
            log2fc = log_expr2.mean() - log_expr1.mean()
            
            results.append({
                'baseMean': expression_data.loc[gene].mean(),
                'log2FoldChange': log2fc,
                'stat': stat,
                'pvalue': pval
            })
        
        results_df = pd.DataFrame(results, index=expression_data.index)
        
        # Multiple testing correction
        _, padj, _, _ = multipletests(results_df['pvalue'], method='fdr_bh')
        results_df['padj'] = padj
        
        return results_df
    
    def survival_analysis_section(self, tab):
        """Survival analysis interface"""
        with tab:
            st.markdown('<h2 class="sub-header">📈 Survival Analysis</h2>', 
                       unsafe_allow_html=True)
            
            if st.session_state.clinical_data is None:
                st.warning("⚠️ Clinical data required for survival analysis!")
                return
            
            # Survival data setup
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("📋 Survival Variables")
                clinical_cols = st.session_state.clinical_data.columns.tolist()
                
                time_col = st.selectbox(
                    "Time to event column:",
                    clinical_cols,
                    help="Column containing survival times"
                )
                
                event_col = st.selectbox(
                    "Event indicator column:",
                    clinical_cols,
                    help="Column with event indicators (0=censored, 1=event)"
                )
            
            with col2:
                st.subheader("🎯 Stratification")
                
                strat_type = st.selectbox(
                    "Stratification by:",
                    ["Clinical variable", "Gene expression", "DE gene signature"]
                )
                
                if strat_type == "Clinical variable":
                    strat_var = st.selectbox("Stratification variable:", clinical_cols)
                elif strat_type == "Gene expression":
                    if st.session_state.gene_symbols:
                        gene_options = list(st.session_state.gene_symbols.values())[:50]
                    else:
                        gene_options = st.session_state.expression_data.index[:50].tolist()
                    
                    target_gene = st.selectbox("Target gene:", gene_options)
                    expression_cutoff = st.selectbox(
                        "Expression cutoff:",
                        ["median", "tertile", "quartile"]
                    )
                else:
                    if st.session_state.de_results is not None:
                        n_genes = st.slider("Number of top DE genes:", 5, 100, 20)
                        signature_direction = st.selectbox("Signature type:", ["Up-regulated", "Down-regulated", "Both"])
            
            # Analysis parameters
            with st.expander("🔧 Analysis Parameters"):
                confidence_level = st.slider("Confidence level:", 0.90, 0.99, 0.95)
                show_risk_table = st.checkbox("Show at-risk numbers", True,
                                             key="survival_show_risk_table")
                
                # Cox regression covariates
                if len(clinical_cols) > 2:
                    cox_covariates = st.multiselect(
                        "Cox regression covariates:",
                        [col for col in clinical_cols if col not in [time_col, event_col]],
                        help="Additional variables for Cox model"
                    )
            
            # Run survival analysis
            if st.button("🚀 Run Survival Analysis", type="primary"):
                with st.spinner("Running survival analysis..."):
                    try:
                        # Prepare survival data
                        if strat_type == "Clinical variable":
                            survival_df = self.survival_analyzer.prepare_survival_data(
                                st.session_state.clinical_data,
                                time_col,
                                event_col
                            )
                            
                            # Add stratification variable
                            survival_df['strat_group'] = st.session_state.clinical_data[strat_var]
                            
                        elif strat_type == "Gene expression":
                            # Find gene in expression data
                            gene_expr = self.find_gene_expression(target_gene)
                            
                            survival_df = self.survival_analyzer.prepare_survival_data(
                                st.session_state.clinical_data,
                                time_col,
                                event_col,
                                gene_expr,
                                target_gene,
                                expression_cutoff
                            )
                        
                        # Kaplan-Meier analysis
                        if strat_type != "DE gene signature":
                            km_results = self.survival_analyzer.kaplan_meier_analysis(
                                survival_df,
                                'strat_group' if strat_type == "Clinical variable" else 'expression_group'
                            )
                            
                            st.session_state.survival_results = km_results
                            
                            # Display results
                            st.success("✅ Survival analysis complete!")
                            
                            # Create survival plot
                            survival_fig = self.survival_analyzer.create_survival_plot(
                                km_results,
                                title=f"Survival Analysis - {strat_type}"
                            )
                            st.plotly_chart(survival_fig, use_container_width=True)
                            
                            # Statistics summary
                            if 'statistics' in km_results:
                                st.subheader("📊 Statistical Results")
                                
                                if 'logrank' in km_results['statistics']:
                                    logrank = km_results['statistics']['logrank']
                                    
                                    col1, col2 = st.columns(2)
                                    with col1:
                                        st.metric("Log-rank p-value", f"{logrank['p_value']:.4f}")
                                    with col2:
                                        st.metric("Test statistic", f"{logrank['test_statistic']:.2f}")
                                        
                                    if logrank['p_value'] < 0.05:
                                        st.success("🎯 Significant difference between survival curves!")
                                    else:
                                        st.info("No significant difference between survival curves")
                            
                            # Median survival times
                            st.subheader("⏱️ Median Survival Times")
                            median_df = pd.DataFrame([
                                {
                                    'Group': group,
                                    'Median Survival': data.get('median', 'Not reached'),
                                    'CI Lower': data.get('confidence_interval', [None, None])[0],
                                    'CI Upper': data.get('confidence_interval', [None, None])[1]
                                }
                                for group, data in km_results['median_survival'].items()
                            ])
                            st.dataframe(median_df, use_container_width=True)
                        
                        # Cox regression if covariates selected
                        if 'cox_covariates' in locals() and cox_covariates:
                            cox_df = survival_df[['duration', 'event'] + cox_covariates].dropna()
                            
                            if len(cox_df) > 10:  # Minimum sample size
                                cox_results = self.survival_analyzer.cox_regression(cox_df, cox_covariates)
                                
                                st.subheader("🏥 Cox Proportional Hazards Model")
                                
                                # Hazard ratios table
                                cox_summary = pd.DataFrame({
                                    'Covariate': cox_results['hazard_ratios'].keys(),
                                    'Hazard Ratio': cox_results['hazard_ratios'].values(),
                                    'CI Lower': cox_results['confidence_intervals']['lower'].values(),
                                    'CI Upper': cox_results['confidence_intervals']['upper'].values(),
                                    'P-value': cox_results['p_values'].values()
                                })
                                st.dataframe(cox_summary, use_container_width=True)
                                
                                # Forest plot
                                forest_fig = self.survival_analyzer.create_forest_plot(
                                    cox_results,
                                    title="Cox Regression - Hazard Ratios"
                                )
                                st.plotly_chart(forest_fig, use_container_width=True)
                                
                                # Model statistics
                                col1, col2, col3 = st.columns(3)
                                with col1:
                                    st.metric("Concordance Index", f"{cox_results['concordance_index']:.3f}")
                                with col2:
                                    st.metric("AIC", f"{cox_results['AIC']:.1f}")
                                with col3:
                                    st.metric("Log Likelihood", f"{cox_results['log_likelihood']:.1f}")
                    
                    except Exception as e:
                        st.error(f"❌ Survival analysis failed: {str(e)}")
            
            # Show current results
            if st.session_state.survival_results is not None:
                with st.container():
                    st.markdown('<div class="info-box">', unsafe_allow_html=True)
                    st.write("✅ **Survival Analysis Results Available**")
                    st.write("📊 Kaplan-Meier curves and statistics computed")
                    st.write("Ready for export and publication!")
                    st.markdown('</div>', unsafe_allow_html=True)
    
    def find_gene_expression(self, target_gene):
        """Find gene expression data for target gene"""
        # Try to find by symbol first
        if st.session_state.gene_symbols:
            for gene_id, symbol in st.session_state.gene_symbols.items():
                if symbol.upper() == target_gene.upper():
                    # Find in expression data
                    for expr_id in st.session_state.expression_data.index:
                        if gene_id in expr_id:
                            return st.session_state.expression_data.loc[expr_id]
        
        # Try partial match
        for expr_id in st.session_state.expression_data.index:
            if target_gene.upper() in expr_id.upper():
                return st.session_state.expression_data.loc[expr_id]
        
        return None
    
    def pathway_analysis_section(self, tab):
        """Pathway enrichment analysis interface"""
        with tab:
            st.markdown('<h2 class="sub-header">🔬 Pathway Enrichment Analysis</h2>', 
                       unsafe_allow_html=True)
            
            if st.session_state.de_results is None:
                st.warning("⚠️ Please run differential expression analysis first!")
                return
            
            # Analysis options
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("📊 Analysis Type")
                analysis_type = st.selectbox(
                    "Enrichment method:",
                    ["Over-representation (Enrichr)", "GSEA Pre-ranked", "Both"]
                )
                
                # Gene set selection
                gene_set_sources = st.multiselect(
                    "Gene set databases:",
                    ["GO_Biological_Process_2023", "KEGG_2021_Human", "Reactome_2022", 
                     "WikiPathways_2019_Human", "MSigDB_Hallmark_2020"],
                    default=["GO_Biological_Process_2023", "KEGG_2021_Human", "Reactome_2022"]
                )
            
            with col2:
                st.subheader("🎯 Gene Selection")
                
                if analysis_type in ["Over-representation (Enrichr)", "Both"]:
                    p_cutoff = st.number_input("P-value cutoff:", 0.001, 0.1, 0.05)
                    fc_cutoff = st.number_input("Log2FC cutoff:", 0.1, 5.0, 1.0)
                    
                    direction = st.selectbox(
                        "Gene direction:",
                        ["Up-regulated only", "Down-regulated only", "Both directions"]
                    )
                
                if analysis_type in ["GSEA Pre-ranked", "Both"]:
                    ranking_metric = st.selectbox(
                        "Ranking metric:",
                        ["Log2 fold change", "-log10(p-value) * sign(FC)", "t-statistic"]
                    )
            
            # Advanced parameters
            with st.expander("🔧 Advanced Parameters"):
                if analysis_type in ["GSEA Pre-ranked", "Both"]:
                    min_gene_set_size = st.number_input("Min gene set size:", 5, 500, 15)
                    max_gene_set_size = st.number_input("Max gene set size:", 100, 2000, 500)
                    n_permutations = st.number_input("Permutations:", 100, 10000, 1000)
                
                fdr_threshold = st.number_input("FDR threshold:", 0.01, 0.3, 0.25)
                max_pathways_display = st.number_input("Max pathways to display:", 10, 100, 20)
            
            # Run pathway analysis
            if st.button("🚀 Run Pathway Analysis", type="primary"):
                with st.spinner("Running pathway enrichment analysis..."):
                    try:
                        results = {}
                        
                        if analysis_type in ["Over-representation (Enrichr)", "Both"]:
                            # Prepare gene list
                            de_results = st.session_state.de_results
                            
                            # Filter significant genes
                            significant = de_results[
                                (de_results['padj'] < p_cutoff) & 
                                (np.abs(de_results['log2FoldChange']) > fc_cutoff)
                            ]
                            
                            if direction == "Up-regulated only":
                                gene_list = significant[significant['log2FoldChange'] > 0].index.tolist()
                            elif direction == "Down-regulated only":
                                gene_list = significant[significant['log2FoldChange'] < 0].index.tolist()
                            else:
                                gene_list = significant.index.tolist()
                            
                            # Convert to gene symbols if available
                            if st.session_state.gene_symbols:
                                gene_symbols = []
                                for gene_id in gene_list:
                                    clean_id = gene_id.split('.')[0]
                                    symbol = st.session_state.gene_symbols.get(clean_id, clean_id)
                                    gene_symbols.append(symbol)
                                gene_list = gene_symbols
                            
                            st.info(f"Analyzing {len(gene_list)} genes...")
                            
                            # Run Enrichr
                            enrichr_results = self.pathway_analyzer.enrichr_analysis(
                                gene_list,
                                databases=gene_set_sources,
                                cutoff=fdr_threshold
                            )
                            
                            results['enrichr'] = enrichr_results
                        
                        if analysis_type in ["GSEA Pre-ranked", "Both"]:
                            # Prepare ranked gene list
                            de_results = st.session_state.de_results.copy()
                            
                            if ranking_metric == "Log2 fold change":
                                ranking = de_results['log2FoldChange']
                            elif ranking_metric == "-log10(p-value) * sign(FC)":
                                ranking = -np.log10(de_results['pvalue'] + 1e-300) * np.sign(de_results['log2FoldChange'])
                            else:  # t-statistic
                                ranking = de_results.get('stat', de_results['log2FoldChange'])
                            
                            # Convert to gene symbols
                            if st.session_state.gene_symbols:
                                ranking.index = [
                                    st.session_state.gene_symbols.get(gid.split('.')[0], gid.split('.')[0])
                                    for gid in ranking.index
                                ]
                            
                            # Run GSEA
                            for gene_set in gene_set_sources:
                                gsea_result = self.pathway_analyzer.gsea_preranked(
                                    ranking,
                                    gene_sets=gene_set,
                                    min_size=min_gene_set_size,
                                    max_size=max_gene_set_size,
                                    permutation_num=n_permutations
                                )
                                
                                if gsea_result:
                                    results[f'gsea_{gene_set}'] = gsea_result
                        
                        st.session_state.pathway_results = results
                        
                        # Display results
                        if results:
                            st.success(f"✅ Pathway analysis complete!")
                            
                            # Results tabs
                            if 'enrichr' in results:
                                st.subheader("📊 Over-representation Analysis Results")
                                
                                for db_name, db_results in results['enrichr'].items():
                                    if db_results['significant_terms'] > 0:
                                        st.write(f"**{db_name}**: {db_results['significant_terms']} significant pathways")
                                        
                                        # Top pathways table
                                        top_pathways = db_results['results'].head(10)
                                        display_cols = ['Term', 'Adjusted P-value', 'Overlap', 'Combined Score']
                                        st.dataframe(top_pathways[display_cols], use_container_width=True)
                                        
                                        # Create enrichment plot
                                        if len(top_pathways) > 0:
                                            plot_data = self.pathway_analyzer.create_enrichment_plot(
                                                top_pathways,
                                                title=f"{db_name} Enrichment",
                                                top_n=min(15, len(top_pathways))
                                            )
                                            
                                            if plot_data:
                                                # Create plotly bar plot
                                                fig = go.Figure(data=go.Bar(
                                                    x=plot_data['x'],
                                                    y=plot_data['y'],
                                                    orientation='h',
                                                    text=plot_data['text'],
                                                    hovertext=plot_data['hover_info'],
                                                    marker_color='lightblue'
                                                ))
                                                
                                                fig.update_layout(
                                                    title=plot_data['title'],
                                                    xaxis_title=plot_data['x_title'],
                                                    yaxis_title=plot_data['y_title'],
                                                    height=max(400, len(plot_data['y']) * 25)
                                                )
                                                
                                                st.plotly_chart(fig, use_container_width=True)
                                    else:
                                        st.info(f"No significant pathways found in {db_name}")
                            
                            # GSEA results
                            gsea_results = {k: v for k, v in results.items() if k.startswith('gsea_')}
                            if gsea_results:
                                st.subheader("🧬 GSEA Results")
                                
                                for gsea_name, gsea_data in gsea_results.items():
                                    db_name = gsea_name.replace('gsea_', '')
                                    
                                    if 'results' in gsea_data:
                                        gsea_df = gsea_data['results']
                                        significant_gsea = gsea_df[gsea_df['FDR q-val'] < fdr_threshold]
                                        
                                        if len(significant_gsea) > 0:
                                            st.write(f"**{db_name}**: {len(significant_gsea)} significant gene sets")
                                            
                                            # Display top results
                                            display_cols = ['Term', 'NES', 'FDR q-val', 'FWER p-val']
                                            st.dataframe(significant_gsea.head(10)[display_cols], 
                                                       use_container_width=True)
                                        else:
                                            st.info(f"No significant gene sets in {db_name}")
                        else:
                            st.warning("No significant results found. Try adjusting parameters.")
                    
                    except Exception as e:
                        st.error(f"❌ Pathway analysis failed: {str(e)}")
            
            # Current results status
            if st.session_state.pathway_results is not None:
                with st.container():
                    st.markdown('<div class="info-box">', unsafe_allow_html=True)
                    st.write("✅ **Pathway Analysis Results Available**")
                    
                    total_pathways = 0
                    if 'enrichr' in st.session_state.pathway_results:
                        for db_results in st.session_state.pathway_results['enrichr'].values():
                            total_pathways += db_results.get('significant_terms', 0)
                    
                    st.write(f"🎯 {total_pathways} significant pathways identified")
                    st.write("Ready for visualization and export!")
                    st.markdown('</div>', unsafe_allow_html=True)
    
    def literature_search_section(self, tab):
        """Literature search and analysis interface"""
        with tab:
            st.markdown('<h2 class="sub-header">📚 Literature Search & Analysis</h2>', 
                       unsafe_allow_html=True)
            
            # Search options
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("🔍 Search Configuration")
                
                search_type = st.selectbox(
                    "Search type:",
                    ["Individual genes", "Gene list", "Pathway terms", "Custom query"]
                )
                
                if search_type == "Individual genes":
                    if st.session_state.gene_symbols:
                        gene_options = list(st.session_state.gene_symbols.values())[:100]
                    else:
                        gene_options = ["TCN1", "TP53", "MYC", "BRCA1"]
                    
                    target_gene = st.selectbox("Select gene:", gene_options)
                
                elif search_type == "Gene list":
                    if st.session_state.de_results is not None:
                        use_de_genes = st.checkbox("Use significant DE genes", True,
                                                  key="literature_use_de_genes")
                        if use_de_genes:
                            max_genes = st.slider("Maximum genes to search:", 5, 50, 20)
                        else:
                            gene_input = st.text_area(
                                "Enter gene symbols (one per line):",
                                placeholder="TCN1\nTP53\nMYC"
                            )
                    else:
                        gene_input = st.text_area(
                            "Enter gene symbols (one per line):",
                            placeholder="TCN1\nTP53\nMYC"
                        )
                
                elif search_type == "Pathway terms":
                    if st.session_state.pathway_results is not None:
                        st.info("Using significant pathways from previous analysis")
                        max_pathways = st.slider("Maximum pathways to search:", 1, 10, 5)
                    else:
                        pathway_input = st.text_area(
                            "Enter pathway names (one per line):",
                            placeholder="p53 signaling pathway\nDNA repair\nCell cycle"
                        )
                
                else:  # Custom query
                    custom_query = st.text_input(
                        "Enter custom PubMed query:",
                        placeholder="(pancreatic cancer) AND (gene expression)"
                    )
            
            with col2:
                st.subheader("⚙️ Search Parameters")
                
                disease_context = st.selectbox(
                    "Disease context:",
                    ["None", "cancer", "pancreatic", "diabetes", "cardiovascular", "neurological"]
                )
                
                years_back = st.slider("Years to search back:", 1, 20, 5)
                max_results_per_search = st.slider("Max results per search:", 10, 200, 50)
                
                # Literature analysis options
                with st.expander("📊 Analysis Options"):
                    generate_bibliography = st.checkbox("Generate bibliography", True,
                                                       key="literature_generate_bibliography")
                    citation_format = st.selectbox("Citation format:", ["APA", "MLA", "Vancouver"])
                    
                    analyze_abstracts = st.checkbox("Analyze abstracts", True,
                                                   key="literature_analyze_abstracts")
                    if analyze_abstracts:
                        st.info("Abstract analysis will identify common themes and keywords")
            
            # Run literature search
            if st.button("🔍 Start Literature Search", type="primary"):
                with st.spinner("Searching PubMed database..."):
                    try:
                        results = {}
                        
                        if search_type == "Individual genes":
                            disease_ctx = disease_context if disease_context != "None" else None
                            
                            gene_results = self.pubmed_searcher.search_gene(
                                target_gene,
                                disease_context=disease_ctx,
                                years_back=years_back,
                                max_results=max_results_per_search
                            )
                            
                            results[target_gene] = gene_results
                        
                        elif search_type == "Gene list":
                            if 'use_de_genes' in locals() and use_de_genes and st.session_state.de_results is not None:
                                # Use significant DE genes
                                significant_genes = st.session_state.de_results[
                                    (st.session_state.de_results['padj'] < 0.05) & 
                                    (np.abs(st.session_state.de_results['log2FoldChange']) > 1.0)
                                ]
                                
                                # Get gene symbols
                                gene_list = []
                                for gene_id in significant_genes.index[:max_genes]:
                                    if st.session_state.gene_symbols:
                                        symbol = st.session_state.gene_symbols.get(
                                            gene_id.split('.')[0], gene_id.split('.')[0]
                                        )
                                        gene_list.append(symbol)
                                    else:
                                        gene_list.append(gene_id)
                            else:
                                gene_list = [gene.strip() for gene in gene_input.split('\n') if gene.strip()]
                            
                            def progress_callback(message, progress):
                                st.info(message)
                            
                            disease_ctx = disease_context if disease_context != "None" else None
                            multi_gene_results = self.pubmed_searcher.search_gene_list(
                                gene_list,
                                disease_context=disease_ctx,
                                max_genes=min(len(gene_list), 20),
                                progress_callback=progress_callback
                            )
                            
                            results = multi_gene_results
                        
                        elif search_type == "Pathway terms":
                            if st.session_state.pathway_results is not None and 'enrichr' in st.session_state.pathway_results:
                                # Use top pathways from enrichment analysis
                                pathway_list = []
                                for db_results in st.session_state.pathway_results['enrichr'].values():
                                    if not db_results['results'].empty:
                                        top_pathways = db_results['results'].head(max_pathways)
                                        pathway_list.extend(top_pathways['Term'].tolist())
                                
                                pathway_list = pathway_list[:max_pathways]  # Limit total pathways
                            else:
                                pathway_list = [p.strip() for p in pathway_input.split('\n') if p.strip()]
                            
                            disease_ctx = disease_context if disease_context != "None" else None
                            
                            for pathway in pathway_list:
                                pathway_results = self.pubmed_searcher.search_pathway(
                                    pathway,
                                    disease_context=disease_ctx,
                                    max_results=max_results_per_search
                                )
                                results[pathway] = pathway_results
                        
                        else:  # Custom query
                            # Direct PubMed search with custom query
                            custom_results = self.pubmed_searcher.pubmed.query(
                                custom_query, 
                                max_results=max_results_per_search
                            )
                            
                            articles = []
                            for article in custom_results:
                                try:
                                    article_data = {
                                        'pmid': getattr(article, 'pubmed_id', ''),
                                        'title': getattr(article, 'title', ''),
                                        'abstract': getattr(article, 'abstract', ''),
                                        'authors': [str(author) for author in getattr(article, 'authors', [])],
                                        'journal': getattr(article, 'journal', ''),
                                        'publication_date': getattr(article, 'publication_date', None)
                                    }
                                    articles.append(article_data)
                                except:
                                    continue
                            
                            results['custom_query'] = {
                                'query': custom_query,
                                'total_results': len(articles),
                                'articles': articles
                            }
                        
                        st.session_state.literature_results = results
                        
                        # Display results summary
                        if results:
                            st.success(f"✅ Literature search complete!")
                            
                            # Summary statistics
                            total_articles = 0
                            searches_with_results = 0
                            
                            for search_term, search_results in results.items():
                                if isinstance(search_results, dict):
                                    articles_count = search_results.get('total_results', 0)
                                    if 'gene_results' in search_results:  # Multi-gene search
                                        articles_count = search_results.get('total_articles', 0)
                                        searches_with_results = search_results.get('genes_with_results', 0)
                                    else:
                                        if articles_count > 0:
                                            searches_with_results += 1
                                    
                                    total_articles += articles_count
                            
                            col1, col2, col3 = st.columns(3)
                            with col1:
                                st.metric("Total Articles", total_articles)
                            with col2:
                                st.metric("Successful Searches", searches_with_results)
                            with col3:
                                avg_per_search = total_articles / max(len(results), 1)
                                st.metric("Avg per Search", f"{avg_per_search:.1f}")
                            
                            # Display top results
                            st.subheader("📄 Recent Publications")
                            
                            if search_type == "Gene list" and 'gene_results' in results:
                                # Show top genes by publication count
                                top_genes = results.get('top_genes_by_publications', [])[:10]
                                
                                if top_genes:
                                    top_genes_df = pd.DataFrame(top_genes, columns=['Gene', 'Publications'])
                                    st.dataframe(top_genes_df, use_container_width=True)
                            
                            else:
                                # Show articles from first search result
                                first_result = list(results.values())[0]
                                if isinstance(first_result, dict) and 'articles' in first_result:
                                    articles = first_result['articles'][:10]
                                    
                                    for i, article in enumerate(articles):
                                        with st.expander(f"📄 {article.get('title', 'No title')[:100]}..."):
                                            col1, col2 = st.columns([3, 1])
                                            
                                            with col1:
                                                st.write(f"**Authors:** {', '.join(article.get('authors', [])[:3])}")
                                                st.write(f"**Journal:** {article.get('journal', 'Unknown')}")
                                                if article.get('abstract'):
                                                    st.write(f"**Abstract:** {article['abstract'][:300]}...")
                                            
                                            with col2:
                                                if article.get('pmid'):
                                                    st.write(f"**PMID:** {article['pmid']}")
                                                if article.get('publication_date'):
                                                    try:
                                                        year = article['publication_date'].year
                                                        st.write(f"**Year:** {year}")
                                                    except:
                                                        pass
                            
                            # Generate bibliography if requested
                            if generate_bibliography:
                                st.subheader("📚 Generated Bibliography")
                                
                                first_result = list(results.values())[0]
                                if isinstance(first_result, dict):
                                    bibliography = self.pubmed_searcher.create_bibliography(
                                        first_result,
                                        format_style=citation_format.lower(),
                                        max_entries=20
                                    )
                                    
                                    st.text_area(
                                        "Bibliography (first 20 entries):",
                                        bibliography,
                                        height=400
                                    )
                        
                        else:
                            st.warning("No results found. Try different search terms or parameters.")
                    
                    except Exception as e:
                        st.error(f"❌ Literature search failed: {str(e)}")
            
            # Current results status
            if st.session_state.literature_results is not None:
                with st.container():
                    st.markdown('<div class="info-box">', unsafe_allow_html=True)
                    st.write("✅ **Literature Search Results Available**")
                    st.write("📚 Publications identified and analyzed")
                    st.write("Ready for export and citation management!")
                    st.markdown('</div>', unsafe_allow_html=True)
    
    def advanced_visualizations_section(self, tab):
        """Advanced visualization and plotting interface"""
        with tab:
            st.markdown('<h2 class="sub-header">📊 Advanced Visualizations</h2>', 
                       unsafe_allow_html=True)
            
            # Check available data
            available_data = {
                'Expression Data': st.session_state.expression_data is not None,
                'DE Results': st.session_state.de_results is not None,
                'Survival Results': st.session_state.survival_results is not None,
                'Pathway Results': st.session_state.pathway_results is not None
            }
            
            # Show data availability
            st.subheader("📊 Available Data")
            cols = st.columns(len(available_data))
            for i, (data_type, available) in enumerate(available_data.items()):
                with cols[i]:
                    if available:
                        st.success(f"✅ {data_type}")
                    else:
                        st.error(f"❌ {data_type}")
            
            # Visualization options
            viz_type = st.selectbox(
                "Choose visualization:",
                [
                    "🌋 Enhanced Volcano Plot",
                    "🔥 Interactive Heatmap", 
                    "📊 PCA Analysis",
                    "📈 Survival Curves",
                    "🔬 Pathway Networks",
                    "📊 Multi-panel Figure",
                    "🎨 Custom Plot Builder"
                ]
            )
            
            # Journal style selection
            journal_style = st.selectbox(
                "Publication style:",
                ["nature", "science", "cell", "nejm", "default"],
                help="Choose journal style for publication-ready figures"
            )
            
            if viz_type == "🌋 Enhanced Volcano Plot":
                self.create_enhanced_volcano_plot(journal_style)
            
            elif viz_type == "🔥 Interactive Heatmap":
                self.create_interactive_heatmap(journal_style)
            
            elif viz_type == "📊 PCA Analysis":
                self.create_pca_visualization(journal_style)
            
            elif viz_type == "📈 Survival Curves":
                self.create_survival_visualization(journal_style)
            
            elif viz_type == "🔬 Pathway Networks":
                self.create_pathway_visualization(journal_style)
            
            elif viz_type == "📊 Multi-panel Figure":
                self.create_multipanel_figure(journal_style)
            
            else:  # Custom Plot Builder
                self.custom_plot_builder(journal_style)
    
    def create_enhanced_volcano_plot(self, journal_style):
        """Create enhanced volcano plot with publication-ready styling"""
        if st.session_state.de_results is None:
            st.warning("⚠️ No differential expression results available!")
            return
        
        st.subheader("🌋 Enhanced Volcano Plot")
        
        # Plot parameters
        col1, col2, col3 = st.columns(3)
        
        with col1:
            p_cutoff = st.slider("P-value cutoff:", 0.001, 0.1, 0.05, step=0.001)
        with col2:
            fc_cutoff = st.slider("Fold change cutoff:", 0.1, 5.0, 1.0, step=0.1)
        with col3:
            point_size = st.slider("Point size:", 1, 10, 4)
        
        # Gene highlighting
        highlight_genes = []
        if st.session_state.gene_symbols:
            available_genes = list(st.session_state.gene_symbols.values())[:50]
            highlight_genes = st.multiselect(
                "Highlight specific genes:",
                available_genes,
                help="Select genes to highlight in yellow"
            )
        
        plot_title = st.text_input("Plot title:", "Differential Gene Expression",
                                  key="volcano_plot_title")
        
        if st.button("Generate Volcano Plot", type="primary", key="generate_volcano_plot"):
            try:
                # Use visualization exporter
                plot_results = self.viz_exporter.create_volcano_plot(
                    st.session_state.de_results,
                    title=plot_title,
                    p_cutoff=p_cutoff,
                    fc_cutoff=fc_cutoff,
                    highlight_genes=highlight_genes,
                    journal_style=journal_style
                )
                
                # Display plot statistics
                if 'statistics' in plot_results:
                    stats = plot_results['statistics']
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Total Genes", stats['total_genes'])
                    with col2:
                        st.metric("Up-regulated", stats['up_regulated'])
                    with col3:
                        st.metric("Down-regulated", stats['down_regulated'])
                    with col4:
                        st.metric("Total Significant", stats['total_significant'])
                
                # Show file paths
                if 'figure_paths' in plot_results:
                    st.success("✅ Publication-ready volcano plot generated!")
                    
                    for format_type, file_path in plot_results['figure_paths'].items():
                        st.info(f"📁 {format_type.upper()} saved: {file_path}")
                
            except Exception as e:
                st.error(f"❌ Failed to create volcano plot: {str(e)}")
    
    def create_interactive_heatmap(self, journal_style):
        """Create interactive heatmap visualization"""
        if st.session_state.expression_data is None:
            st.warning("⚠️ No expression data available!")
            return
        
        st.subheader("🔥 Interactive Expression Heatmap")
        
        # Heatmap parameters
        col1, col2 = st.columns(2)
        
        with col1:
            if st.session_state.de_results is not None:
                use_de_genes = st.checkbox("Use significant DE genes only", True,
                                          key="heatmap_use_de_genes")
                if use_de_genes:
                    n_genes = st.slider("Number of top DE genes:", 20, 200, 50)
            else:
                n_genes = st.slider("Number of top variable genes:", 20, 500, 100)
        
        with col2:
            cluster_rows = st.checkbox("Cluster genes", True,
                                      key="heatmap_cluster_rows")
            cluster_cols = st.checkbox("Cluster samples", True,
                                      key="heatmap_cluster_cols")
            color_scale = st.selectbox("Color scale:", ["RdBu_r", "viridis", "plasma"])
        
        plot_title = st.text_input("Heatmap title:", "Gene Expression Heatmap",
                                  key="heatmap_plot_title")
        
        if st.button("Generate Heatmap", type="primary", key="generate_heatmap"):
            try:
                # Select genes for heatmap
                if st.session_state.de_results is not None and 'use_de_genes' in locals() and use_de_genes:
                    # Use top significant DE genes
                    significant = st.session_state.de_results[
                        (st.session_state.de_results['padj'] < 0.05) & 
                        (np.abs(st.session_state.de_results['log2FoldChange']) > 1.0)
                    ]
                    
                    if len(significant) > 0:
                        top_genes = significant.nsmallest(n_genes, 'padj').index
                        heatmap_data = st.session_state.expression_data.loc[top_genes]
                    else:
                        st.warning("No significant DE genes found. Using top variable genes.")
                        gene_vars = st.session_state.expression_data.var(axis=1).nlargest(n_genes)
                        heatmap_data = st.session_state.expression_data.loc[gene_vars.index]
                else:
                    # Use top variable genes
                    gene_vars = st.session_state.expression_data.var(axis=1).nlargest(n_genes)
                    heatmap_data = st.session_state.expression_data.loc[gene_vars.index]
                
                # Log transform and center
                heatmap_data = np.log2(heatmap_data + 1)
                heatmap_data = heatmap_data.subtract(heatmap_data.mean(axis=1), axis=0)
                
                # Create interactive plotly heatmap
                gene_labels = heatmap_data.index.tolist()
                if st.session_state.gene_symbols:
                    gene_labels = [
                        st.session_state.gene_symbols.get(gid.split('.')[0], gid.split('.')[0])
                        for gid in gene_labels
                    ]
                
                fig = go.Figure(data=go.Heatmap(
                    z=heatmap_data.values,
                    x=heatmap_data.columns,
                    y=gene_labels,
                    colorscale=color_scale,
                    zmid=0,
                    hovertemplate='Sample: %{x}<br>Gene: %{y}<br>Expression: %{z:.2f}<extra></extra>'
                ))
                
                fig.update_layout(
                    title=plot_title,
                    width=max(800, len(heatmap_data.columns) * 20),
                    height=max(600, len(heatmap_data) * 15),
                    xaxis_title="Samples",
                    yaxis_title="Genes"
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Also create publication-ready version
                plot_results = self.viz_exporter.create_heatmap(
                    heatmap_data,
                    row_clustering=cluster_rows,
                    col_clustering=cluster_cols,
                    title=plot_title,
                    journal_style=journal_style
                )
                
                if 'figure_paths' in plot_results:
                    st.success("✅ Publication-ready heatmap generated!")
                    for format_type, file_path in plot_results['figure_paths'].items():
                        st.info(f"📁 {format_type.upper()} saved: {file_path}")
                
            except Exception as e:
                st.error(f"❌ Failed to create heatmap: {str(e)}")
    
    def create_pca_visualization(self, journal_style):
        """Create PCA visualization"""
        if st.session_state.expression_data is None:
            st.warning("⚠️ No expression data available!")
            return
        
        st.subheader("📊 Principal Component Analysis")
        
        # PCA parameters
        col1, col2 = st.columns(2)
        
        with col1:
            n_components = st.slider("Number of components:", 2, 10, 5)
            n_features = st.slider("Number of features for PCA:", 500, 5000, 2000)
            
        with col2:
            color_by = st.selectbox(
                "Color samples by:",
                ["None"] + (st.session_state.clinical_data.columns.tolist() 
                           if st.session_state.clinical_data is not None else [])
            )
            
            standardize = st.checkbox("Standardize features", True,
                                     key="pca_standardize")
        
        if st.button("Run PCA Analysis", type="primary"):
            try:
                from sklearn.decomposition import PCA
                from sklearn.preprocessing import StandardScaler
                
                # Select top variable genes
                gene_vars = st.session_state.expression_data.var(axis=1).nlargest(n_features)
                pca_data = st.session_state.expression_data.loc[gene_vars.index].T
                
                # Standardize if requested
                if standardize:
                    scaler = StandardScaler()
                    pca_data_scaled = scaler.fit_transform(pca_data)
                else:
                    pca_data_scaled = pca_data.values
                
                # Perform PCA
                pca = PCA(n_components=n_components)
                pca_result = pca.fit_transform(pca_data_scaled)
                
                # Create results dataframe
                pca_df = pd.DataFrame(
                    pca_result,
                    index=pca_data.index,
                    columns=[f'PC{i+1}' for i in range(n_components)]
                )
                
                # Add grouping variable if available
                groups = None
                if color_by != "None" and st.session_state.clinical_data is not None:
                    # Match samples
                    common_samples = pca_df.index.intersection(
                        st.session_state.clinical_data['sample_id'] if 'sample_id' in st.session_state.clinical_data.columns
                        else st.session_state.clinical_data.index
                    )
                    
                    if len(common_samples) > 0:
                        clinical_subset = st.session_state.clinical_data.set_index('sample_id') \
                            if 'sample_id' in st.session_state.clinical_data.columns \
                            else st.session_state.clinical_data
                        
                        groups = clinical_subset.loc[common_samples, color_by]
                        pca_df = pca_df.loc[common_samples]
                
                # Create interactive PCA plot
                if groups is not None:
                    fig = px.scatter(
                        pca_df,
                        x='PC1',
                        y='PC2',
                        color=groups,
                        hover_data=['PC3'] if n_components > 2 else None,
                        title="PCA - Sample Clustering"
                    )
                else:
                    fig = px.scatter(
                        pca_df,
                        x='PC1',
                        y='PC2',
                        hover_data=['PC3'] if n_components > 2 else None,
                        title="PCA - Sample Clustering"
                    )
                
                # Update layout
                variance_explained = pca.explained_variance_ratio_
                fig.update_layout(
                    xaxis_title=f'PC1 ({variance_explained[0]:.1%} variance)',
                    yaxis_title=f'PC2 ({variance_explained[1]:.1%} variance)',
                    width=800,
                    height=600
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Show explained variance
                st.subheader("📊 Explained Variance")
                variance_df = pd.DataFrame({
                    'Component': [f'PC{i+1}' for i in range(n_components)],
                    'Variance Explained (%)': variance_explained * 100,
                    'Cumulative (%)': np.cumsum(variance_explained) * 100
                })
                
                st.dataframe(variance_df, use_container_width=True)
                
                # Create publication-ready version
                plot_results = self.viz_exporter.create_pca_plot(
                    pca_df,
                    groups=groups,
                    title="PCA Analysis",
                    journal_style=journal_style
                )
                
                if 'figure_paths' in plot_results:
                    st.success("✅ Publication-ready PCA plot generated!")
                    for format_type, file_path in plot_results['figure_paths'].items():
                        st.info(f"📁 {format_type.upper()} saved: {file_path}")
            
            except Exception as e:
                st.error(f"❌ PCA analysis failed: {str(e)}")
    
    def create_survival_visualization(self, journal_style):
        """Create survival curve visualization"""
        if st.session_state.survival_results is None:
            st.warning("⚠️ No survival analysis results available!")
            return
        
        st.subheader("📈 Survival Curve Visualization")
        
        plot_title = st.text_input("Plot title:", "Kaplan-Meier Survival Curves",
                                  key="survival_plot_title")
        
        if st.button("Generate Survival Plot", type="primary", key="generate_survival_plot"):
            try:
                # Create interactive survival plot
                survival_fig = self.survival_analyzer.create_survival_plot(
                    st.session_state.survival_results,
                    title=plot_title
                )
                
                st.plotly_chart(survival_fig, use_container_width=True)
                
                # Create publication-ready version
                plot_results = self.viz_exporter.create_survival_plot(
                    st.session_state.survival_results,
                    title=plot_title,
                    journal_style=journal_style
                )
                
                if 'figure_paths' in plot_results:
                    st.success("✅ Publication-ready survival plot generated!")
                    for format_type, file_path in plot_results['figure_paths'].items():
                        st.info(f"📁 {format_type.upper()} saved: {file_path}")
                
            except Exception as e:
                st.error(f"❌ Failed to create survival plot: {str(e)}")
    
    def create_pathway_visualization(self, journal_style):
        """Create pathway enrichment visualization"""
        if st.session_state.pathway_results is None:
            st.warning("⚠️ No pathway analysis results available!")
            return
        
        st.subheader("🔬 Pathway Enrichment Visualization")
        
        # Select database to visualize
        if 'enrichr' in st.session_state.pathway_results:
            available_dbs = list(st.session_state.pathway_results['enrichr'].keys())
            selected_db = st.selectbox("Select pathway database:", available_dbs)
            
            n_pathways = st.slider("Number of pathways to show:", 5, 30, 15)
            plot_title = st.text_input("Plot title:", f"{selected_db} Enrichment",
                                      key="pathway_plot_title")
            
            if st.button("Generate Pathway Plot", type="primary", key="generate_pathway_plot"):
                try:
                    db_results = st.session_state.pathway_results['enrichr'][selected_db]
                    
                    if not db_results['results'].empty:
                        # Create publication-ready plot
                        plot_results = self.viz_exporter.create_pathway_enrichment_plot(
                            db_results['results'],
                            title=plot_title,
                            top_n=n_pathways,
                            journal_style=journal_style
                        )
                        
                        if 'figure_paths' in plot_results:
                            st.success("✅ Publication-ready pathway plot generated!")
                            for format_type, file_path in plot_results['figure_paths'].items():
                                st.info(f"📁 {format_type.upper()} saved: {file_path}")
                        
                        # Show statistics
                        if 'statistics' in plot_results:
                            stats = plot_results['statistics']
                            col1, col2 = st.columns(2)
                            with col1:
                                st.metric("Pathways Shown", stats['pathways_shown'])
                            with col2:
                                st.metric("Significant", stats['significant_pathways'])
                    
                    else:
                        st.warning("No pathway results to visualize!")
                
                except Exception as e:
                    st.error(f"❌ Failed to create pathway plot: {str(e)}")
        
        else:
            st.info("No enrichment results available for visualization.")
    
    def create_multipanel_figure(self, journal_style):
        """Create multi-panel figure for publication"""
        st.subheader("📊 Multi-panel Figure Creator")
        
        st.info("Create publication-ready multi-panel figures combining multiple visualizations.")
        
        # Panel layout
        col1, col2 = st.columns(2)
        with col1:
            n_rows = st.selectbox("Number of rows:", [1, 2, 3], index=1)
        with col2:
            n_cols = st.selectbox("Number of columns:", [1, 2, 3], index=1)
        
        # Panel selection
        available_plots = []
        plot_files = list(Path(self.viz_exporter.output_dir).glob("*.png"))
        
        if plot_files:
            st.write(f"Available plots from exports directory:")
            selected_plots = st.multiselect(
                "Select plots for panels:",
                [p.name for p in plot_files],
                help=f"Select up to {n_rows * n_cols} plots"
            )
            
            if len(selected_plots) > n_rows * n_cols:
                st.warning(f"⚠️ Too many plots selected. Maximum is {n_rows * n_cols}")
                selected_plots = selected_plots[:n_rows * n_cols]
        else:
            st.info("No exported plots found. Generate some visualizations first!")
            selected_plots = []
        
        # Panel labels
        panel_labels = []
        if selected_plots:
            st.subheader("Panel Labels")
            default_labels = [chr(65 + i) for i in range(len(selected_plots))]  # A, B, C, etc.
            
            for i, plot in enumerate(selected_plots):
                label = st.text_input(f"Label for {plot}:", default_labels[i], key=f"label_{i}")
                panel_labels.append(label)
        
        figure_title = st.text_input("Overall figure title:", "Multi-panel Analysis")
        
        if st.button("Create Multi-panel Figure", type="primary") and selected_plots:
            try:
                # Create full file paths
                plot_paths = [str(Path(self.viz_exporter.output_dir) / plot) for plot in selected_plots]
                
                # Create multi-panel figure
                combined_path = self.viz_exporter.create_figure_panel(
                    plot_paths,
                    panel_layout=(n_rows, n_cols),
                    labels=panel_labels,
                    title=figure_title
                )
                
                if combined_path:
                    st.success("✅ Multi-panel figure created successfully!")
                    st.info(f"📁 Saved: {combined_path}")
                    
                    # Display the combined figure
                    st.image(combined_path, caption=figure_title, use_column_width=True)
                
            except Exception as e:
                st.error(f"❌ Failed to create multi-panel figure: {str(e)}")
    
    def custom_plot_builder(self, journal_style):
        """Custom plot builder interface"""
        st.subheader("🎨 Custom Plot Builder")
        
        st.info("Build custom visualizations from your data.")
        
        # Plot type selection
        plot_type = st.selectbox(
            "Plot type:",
            ["Scatter Plot", "Box Plot", "Bar Plot", "Line Plot", "Histogram", "Correlation Heatmap"]
        )
        
        # Data selection
        if st.session_state.expression_data is not None:
            data_source = st.selectbox("Data source:", ["Expression Data", "Clinical Data", "DE Results"])
            
            if data_source == "Expression Data":
                available_features = st.session_state.expression_data.index.tolist()[:100]  # Limit for performance
            elif data_source == "Clinical Data" and st.session_state.clinical_data is not None:
                available_features = st.session_state.clinical_data.columns.tolist()
            elif data_source == "DE Results" and st.session_state.de_results is not None:
                available_features = st.session_state.de_results.columns.tolist()
            else:
                available_features = []
            
            if available_features:
                # Variable selection based on plot type
                if plot_type in ["Scatter Plot", "Line Plot"]:
                    x_var = st.selectbox("X variable:", available_features)
                    y_var = st.selectbox("Y variable:", [f for f in available_features if f != x_var])
                    
                    if st.session_state.clinical_data is not None:
                        color_var = st.selectbox("Color by:", ["None"] + st.session_state.clinical_data.columns.tolist())
                
                elif plot_type in ["Box Plot", "Histogram"]:
                    target_var = st.selectbox("Target variable:", available_features)
                    
                    if plot_type == "Box Plot" and st.session_state.clinical_data is not None:
                        group_var = st.selectbox("Group by:", st.session_state.clinical_data.columns.tolist())
                
                elif plot_type == "Bar Plot":
                    if data_source == "DE Results":
                        st.info("Will create bar plot of top significant genes")
                    else:
                        target_var = st.selectbox("Target variable:", available_features)
                
                elif plot_type == "Correlation Heatmap":
                    if data_source == "Expression Data":
                        n_genes = st.slider("Number of genes for correlation:", 20, 200, 50)
                
                # Plot customization
                plot_title = st.text_input("Plot title:", f"Custom {plot_type}",
                                          key="custom_plot_title")
                
                if st.button("Generate Custom Plot", type="primary", key="generate_custom_plot"):
                    try:
                        # Create the custom plot based on selections
                        # This is a simplified implementation
                        if plot_type == "Scatter Plot":
                            # Implementation would depend on data source and variables
                            st.info("Custom scatter plot generation - implementation in progress")
                        
                        elif plot_type == "Box Plot":
                            st.info("Custom box plot generation - implementation in progress")
                        
                        elif plot_type == "Correlation Heatmap" and data_source == "Expression Data":
                            # Select top variable genes
                            gene_vars = st.session_state.expression_data.var(axis=1).nlargest(n_genes)
                            corr_data = st.session_state.expression_data.loc[gene_vars.index].T.corr()
                            
                            fig = px.imshow(
                                corr_data,
                                title=plot_title,
                                color_continuous_scale="RdBu_r",
                                aspect="auto"
                            )
                            
                            st.plotly_chart(fig, use_container_width=True)
                        
                        else:
                            st.info(f"Custom {plot_type} generation - implementation in progress")
                    
                    except Exception as e:
                        st.error(f"❌ Failed to create custom plot: {str(e)}")
            
            else:
                st.warning("No data available for selected source.")
    
    def export_results_section(self, tab):
        """Export and results management interface"""
        with tab:
            st.markdown('<h2 class="sub-header">💾 Export & Results Management</h2>', 
                       unsafe_allow_html=True)
            
            # Results summary
            st.subheader("📊 Analysis Summary")
            
            # Check what analyses have been completed
            analyses_completed = {
                "Data Import": st.session_state.expression_data is not None,
                "Gene Conversion": bool(st.session_state.gene_symbols),
                "Differential Expression": st.session_state.de_results is not None,
                "Survival Analysis": st.session_state.survival_results is not None,
                "Pathway Analysis": st.session_state.pathway_results is not None,
                "Literature Search": st.session_state.literature_results is not None
            }
            
            # Display completion status
            cols = st.columns(3)
            for i, (analysis, completed) in enumerate(analyses_completed.items()):
                col_idx = i % 3
                with cols[col_idx]:
                    if completed:
                        st.success(f"✅ {analysis}")
                    else:
                        st.error(f"❌ {analysis}")
            
            # Export options
            st.subheader("💾 Export Options")
            
            export_format = st.selectbox(
                "Export format:",
                ["Excel (XLSX)", "CSV Files", "JSON", "PDF Report", "All Formats"]
            )
            
            include_options = st.multiselect(
                "Include in export:",
                ["Raw expression data", "Processed data", "DE results", "Pathway results", 
                 "Survival results", "Literature results", "Visualizations", "Analysis parameters"],
                default=["DE results", "Pathway results", "Visualizations"]
            )
            
            # Export settings
            with st.expander("📋 Export Settings"):
                timestamp = st.checkbox("Include timestamp in filenames", True,
                                       key="export_timestamp_filenames")
                compress_files = st.checkbox("Compress export files", False,
                                            key="export_compress_files")
                
                # Publication settings
                st.subheader("📄 Publication Export")
                include_bibliography = st.checkbox("Generate bibliography", True,
                                                  key="export_generate_bibliography")
                include_methods = st.checkbox("Include methods section", True,
                                             key="export_include_methods")
                journal_format = st.selectbox(
                    "Journal format:",
                    ["Generic", "Nature", "Science", "Cell", "NEJM"]
                )
            
            # Generate exports
            if st.button("📤 Generate Export Package", type="primary"):
                with st.spinner("Generating export package..."):
                    try:
                        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S") if timestamp else ""
                        export_results = {}
                        
                        # Create export directory
                        export_dir = Path(self.viz_exporter.output_dir) / f"prairie_genomics_export_{timestamp_str}"
                        export_dir.mkdir(exist_ok=True)
                        
                        # Export data based on selections
                        if "Raw expression data" in include_options and st.session_state.expression_data is not None:
                            if export_format in ["Excel (XLSX)", "All Formats"]:
                                expr_path = export_dir / f"expression_data_{timestamp_str}.xlsx"
                                st.session_state.expression_data.to_excel(expr_path)
                                export_results['expression_data'] = str(expr_path)
                            
                            if export_format in ["CSV Files", "All Formats"]:
                                expr_path = export_dir / f"expression_data_{timestamp_str}.csv"
                                st.session_state.expression_data.to_csv(expr_path)
                                export_results['expression_data_csv'] = str(expr_path)
                        
                        if "DE results" in include_options and st.session_state.de_results is not None:
                            if export_format in ["Excel (XLSX)", "All Formats"]:
                                de_path = export_dir / f"differential_expression_{timestamp_str}.xlsx"
                                st.session_state.de_results.to_excel(de_path)
                                export_results['de_results'] = str(de_path)
                            
                            if export_format in ["CSV Files", "All Formats"]:
                                de_path = export_dir / f"differential_expression_{timestamp_str}.csv"
                                st.session_state.de_results.to_csv(de_path)
                                export_results['de_results_csv'] = str(de_path)
                        
                        if "Pathway results" in include_options and st.session_state.pathway_results is not None:
                            pathway_path = export_dir / f"pathway_analysis_{timestamp_str}.xlsx"
                            
                            with pd.ExcelWriter(pathway_path) as writer:
                                if 'enrichr' in st.session_state.pathway_results:
                                    for db_name, db_results in st.session_state.pathway_results['enrichr'].items():
                                        if not db_results['results'].empty:
                                            sheet_name = db_name[:31]  # Excel limit
                                            db_results['results'].to_excel(writer, sheet_name=sheet_name)
                            
                            export_results['pathway_results'] = str(pathway_path)
                        
                        if "Literature results" in include_options and st.session_state.literature_results is not None:
                            lit_path = export_dir / f"literature_search_{timestamp_str}.xlsx"
                            self.pubmed_searcher.export_results(
                                st.session_state.literature_results,
                                str(lit_path),
                                include_bibliography=include_bibliography
                            )
                            export_results['literature_results'] = str(lit_path)
                        
                        if "Visualizations" in include_options:
                            # Copy visualization files
                            viz_files = list(Path(self.viz_exporter.output_dir).glob("*.png"))
                            viz_files.extend(Path(self.viz_exporter.output_dir).glob("*.pdf"))
                            viz_files.extend(Path(self.viz_exporter.output_dir).glob("*.eps"))
                            
                            viz_dir = export_dir / "visualizations"
                            viz_dir.mkdir(exist_ok=True)
                            
                            for viz_file in viz_files:
                                if timestamp_str in viz_file.name or not timestamp:  # Only recent files
                                    import shutil
                                    shutil.copy(viz_file, viz_dir / viz_file.name)
                            
                            export_results['visualizations'] = str(viz_dir)
                        
                        # Generate comprehensive report
                        if export_format in ["PDF Report", "All Formats"] or include_methods:
                            report_path = export_dir / f"analysis_report_{timestamp_str}.txt"
                            report_content = self.generate_comprehensive_report()
                            
                            with open(report_path, 'w') as f:
                                f.write(report_content)
                            
                            export_results['report'] = str(report_path)
                        
                        # Save analysis parameters
                        if "Analysis parameters" in include_options:
                            params_path = export_dir / f"analysis_parameters_{timestamp_str}.json"
                            params = {
                                'timestamp': datetime.now().isoformat(),
                                'analyses_completed': analyses_completed,
                                'export_settings': {
                                    'format': export_format,
                                    'journal_format': journal_format,
                                    'include_options': include_options
                                }
                            }
                            
                            with open(params_path, 'w') as f:
                                json.dump(params, f, indent=2)
                            
                            export_results['parameters'] = str(params_path)
                        
                        # Compress if requested
                        if compress_files:
                            import zipfile
                            zip_path = export_dir.parent / f"{export_dir.name}.zip"
                            
                            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                                for file_path in export_dir.rglob('*'):
                                    if file_path.is_file():
                                        arcname = file_path.relative_to(export_dir.parent)
                                        zipf.write(file_path, arcname)
                            
                            export_results['compressed'] = str(zip_path)
                        
                        # Show export summary
                        st.success("✅ Export package generated successfully!")
                        
                        st.subheader("📁 Exported Files")
                        for export_type, file_path in export_results.items():
                            st.info(f"**{export_type.replace('_', ' ').title()}**: {file_path}")
                        
                        # Provide download information
                        st.subheader("📥 Download Instructions")
                        st.write("Files have been saved to the exports directory. You can:")
                        st.write("1. Copy files from the export directory to your desired location")
                        st.write("2. Use the file paths shown above to access individual files")
                        st.write("3. Share the export directory for collaborative analysis")
                    
                    except Exception as e:
                        st.error(f"❌ Export failed: {str(e)}")
            
            # Results browser
            st.subheader("🗂️ Results Browser")
            
            if st.button("📂 Show Export Directory Contents"):
                export_files = list(Path(self.viz_exporter.output_dir).iterdir())
                
                if export_files:
                    files_df = pd.DataFrame([
                        {
                            'Filename': f.name,
                            'Type': f.suffix.upper() if f.suffix else 'Directory',
                            'Size (KB)': f.stat().st_size // 1024 if f.is_file() else 0,
                            'Modified': datetime.fromtimestamp(f.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                        }
                        for f in export_files
                    ])
                    
                    st.dataframe(files_df, use_container_width=True)
                else:
                    st.info("No files in export directory")
            
            # Cleanup options
            with st.expander("🧹 Cleanup Options"):
                st.warning("⚠️ These actions cannot be undone!")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button("🗑️ Clear Cache"):
                        self.gene_converter.clear_cache()
                        self.pubmed_searcher.clear_cache()
                        st.success("✅ Cache cleared!")
                
                with col2:
                    if st.button("📁 Clear Export Directory"):
                        import shutil
                        shutil.rmtree(self.viz_exporter.output_dir)
                        self.viz_exporter.output_dir.mkdir(exist_ok=True)
                        st.success("✅ Export directory cleared!")
    
    def generate_comprehensive_report(self):
        """Generate comprehensive analysis report"""
        report = f"""
# Prairie Genomics Suite - Comprehensive Analysis Report

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Analysis Summary

### Data Overview
"""
        
        if st.session_state.expression_data is not None:
            expr_shape = st.session_state.expression_data.shape
            report += f"""
- **Expression Data**: {expr_shape[0]:,} genes × {expr_shape[1]:,} samples
- **Data Type**: Gene expression matrix
"""
        
        if st.session_state.clinical_data is not None:
            clin_shape = st.session_state.clinical_data.shape
            report += f"""
- **Clinical Data**: {clin_shape[0]:,} samples × {clin_shape[1]:,} variables
"""
        
        if st.session_state.gene_symbols:
            report += f"""
- **Gene Conversion**: {len(st.session_state.gene_symbols):,} genes converted to symbols
"""
        
        # Differential expression results
        if st.session_state.de_results is not None:
            de_results = st.session_state.de_results
            significant = de_results[
                (de_results['padj'] < 0.05) & 
                (np.abs(de_results['log2FoldChange']) > 1.0)
            ]
            up_genes = len(significant[significant['log2FoldChange'] > 0])
            down_genes = len(significant[significant['log2FoldChange'] < 0])
            
            report += f"""

### Differential Expression Analysis
- **Total genes analyzed**: {len(de_results):,}
- **Significant genes**: {len(significant):,}
- **Up-regulated**: {up_genes:,}
- **Down-regulated**: {down_genes:,}
- **Statistical method**: Differential expression analysis
- **Multiple testing correction**: Benjamini-Hochberg FDR
"""
        
        # Pathway analysis results
        if st.session_state.pathway_results is not None:
            report += "\n### Pathway Enrichment Analysis\n"
            
            if 'enrichr' in st.session_state.pathway_results:
                total_pathways = 0
                for db_name, db_results in st.session_state.pathway_results['enrichr'].items():
                    sig_pathways = db_results.get('significant_terms', 0)
                    total_pathways += sig_pathways
                    report += f"- **{db_name}**: {sig_pathways} significant pathways\n"
                
                report += f"- **Total significant pathways**: {total_pathways}\n"
        
        # Survival analysis results
        if st.session_state.survival_results is not None:
            report += "\n### Survival Analysis\n"
            
            if 'statistics' in st.session_state.survival_results:
                if 'logrank' in st.session_state.survival_results['statistics']:
                    logrank = st.session_state.survival_results['statistics']['logrank']
                    report += f"- **Log-rank test p-value**: {logrank['p_value']:.4f}\n"
                    
                    if logrank['p_value'] < 0.05:
                        report += "- **Result**: Significant difference between survival curves\n"
                    else:
                        report += "- **Result**: No significant difference between survival curves\n"
        
        # Literature search results
        if st.session_state.literature_results is not None:
            report += "\n### Literature Search Results\n"
            
            total_articles = 0
            if isinstance(st.session_state.literature_results, dict):
                for search_term, results in st.session_state.literature_results.items():
                    if isinstance(results, dict):
                        articles = results.get('total_results', 0)
                        if 'gene_results' in results:
                            articles = results.get('total_articles', 0)
                        total_articles += articles
            
            report += f"- **Total articles found**: {total_articles}\n"
            report += "- **Search scope**: PubMed database\n"
        
        report += f"""

## Methods

### Data Processing
1. Gene expression data was imported and quality controlled
2. Low-expression genes were filtered based on expression thresholds
3. Gene IDs were converted to standard symbols using MyGene.info API

### Statistical Analysis
1. Differential expression analysis was performed using appropriate statistical methods
2. Multiple testing correction was applied using Benjamini-Hochberg FDR
3. Significance thresholds: adjusted p-value < 0.05, |log2FC| > 1.0

### Pathway Analysis
1. Over-representation analysis was performed using Enrichr
2. Gene sets from KEGG, GO, and Reactome databases were analyzed
3. Significant pathways were identified at FDR < 0.05

### Visualization
1. Publication-ready figures were generated using matplotlib and plotly
2. Figures follow journal-specific formatting guidelines
3. All plots include appropriate statistical annotations

## Data Availability
- All analysis results and visualizations are available in the export directory
- Raw data and processed results can be shared for reproducibility
- Analysis parameters and methods are documented for transparency

## Software Information
- **Platform**: Prairie Genomics Suite v2.0
- **Analysis Date**: {datetime.now().strftime('%Y-%m-%d')}
- **Dependencies**: Python, Streamlit, pandas, numpy, scipy, matplotlib, plotly

---

For questions about this analysis, please refer to the Prairie Genomics Suite documentation.
"""
        
        return report
    
    def settings_section(self, tab):
        """Application settings and configuration"""
        with tab:
            st.markdown('<h2 class="sub-header">⚙️ Settings & Configuration</h2>', 
                       unsafe_allow_html=True)
            
            # Analysis settings
            st.subheader("🧬 Analysis Settings")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("**Default Thresholds**")
                default_p_threshold = st.number_input("Default p-value threshold:", 0.001, 0.1, 0.05)
                default_fc_threshold = st.number_input("Default fold change threshold:", 0.1, 5.0, 1.0)
                default_fdr_threshold = st.number_input("Default FDR threshold:", 0.01, 0.3, 0.25)
            
            with col2:
                st.write("**API Settings**")
                api_rate_limit = st.slider("API rate limit (requests/sec):", 1, 10, 3)
                cache_expiry_days = st.slider("Cache expiry (days):", 1, 30, 7)
                max_batch_size = st.slider("Maximum batch size:", 10, 200, 50)
            
            # Visualization settings
            st.subheader("📊 Visualization Settings")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("**Publication Settings**")
                default_journal = st.selectbox("Default journal style:", ["nature", "science", "cell", "nejm"])
                default_dpi = st.slider("Default DPI:", 150, 600, 300)
                default_figure_format = st.selectbox("Default figure format:", ["PNG", "PDF", "EPS", "SVG"])
            
            with col2:
                st.write("**Color Settings**")
                color_palette = st.selectbox("Default color palette:", ["nature", "science", "cell", "nejm", "default"])
                use_colorblind_friendly = st.checkbox("Use colorblind-friendly colors", True,
                                                     key="settings_colorblind_colors")
            
            # Export settings
            st.subheader("💾 Export Settings")
            
            export_dir = st.text_input("Export directory:", str(self.viz_exporter.output_dir))
            auto_timestamp = st.checkbox("Auto-timestamp exports", True,
                                        key="settings_auto_timestamp")
            compress_by_default = st.checkbox("Compress exports by default", False,
                                             key="settings_compress_default")
            
            # Performance settings
            st.subheader("⚡ Performance Settings")
            
            col1, col2 = st.columns(2)
            
            with col1:
                max_genes_display = st.slider("Max genes to display:", 100, 10000, 2000)
                max_pathways_display = st.slider("Max pathways to display:", 10, 100, 50)
            
            with col2:
                enable_parallel = st.checkbox("Enable parallel processing", True,
                                             key="settings_enable_parallel")
                max_workers = st.slider("Max worker threads:", 1, 8, 4)
            
            # Data sources
            st.subheader("🔗 Data Sources")
            
            pubmed_email = st.text_input("PubMed API email:", "user@example.com", 
                                       help="Required for PubMed API access")
            
            enable_tcga = st.checkbox("Enable TCGA data integration", False,
                                     key="settings_enable_tcga")
            enable_geo = st.checkbox("Enable GEO database integration", False,
                                    key="settings_enable_geo")
            
            # Advanced settings
            with st.expander("🔧 Advanced Settings"):
                debug_mode = st.checkbox("Enable debug mode", False,
                                        key="settings_debug_mode")
                verbose_logging = st.checkbox("Verbose logging", False,
                                             key="settings_verbose_logging")
                
                # Cache settings
                st.write("**Cache Management**")
                cache_size_mb = st.slider("Cache size limit (MB):", 100, 5000, 1000)
                
                # Memory settings
                st.write("**Memory Management**")
                max_memory_usage = st.slider("Max memory usage (GB):", 1, 16, 4)
                
            # Save settings
            if st.button("💾 Save Settings", type="primary"):
                settings = {
                    'analysis': {
                        'default_p_threshold': default_p_threshold,
                        'default_fc_threshold': default_fc_threshold,
                        'default_fdr_threshold': default_fdr_threshold
                    },
                    'api': {
                        'rate_limit': api_rate_limit,
                        'cache_expiry_days': cache_expiry_days,
                        'max_batch_size': max_batch_size
                    },
                    'visualization': {
                        'default_journal': default_journal,
                        'default_dpi': default_dpi,
                        'default_format': default_figure_format,
                        'color_palette': color_palette,
                        'colorblind_friendly': use_colorblind_friendly
                    },
                    'export': {
                        'directory': export_dir,
                        'auto_timestamp': auto_timestamp,
                        'compress_by_default': compress_by_default
                    },
                    'performance': {
                        'max_genes_display': max_genes_display,
                        'max_pathways_display': max_pathways_display,
                        'enable_parallel': enable_parallel,
                        'max_workers': max_workers
                    },
                    'data_sources': {
                        'pubmed_email': pubmed_email,
                        'enable_tcga': enable_tcga,
                        'enable_geo': enable_geo
                    }
                }
                
                # Save to file
                settings_path = Path("prairie_genomics_settings.json")
                with open(settings_path, 'w') as f:
                    json.dump(settings, f, indent=2)
                
                st.success(f"✅ Settings saved to {settings_path}")
            
            # Load settings
            if st.button("📂 Load Settings"):
                settings_path = Path("prairie_genomics_settings.json")
                if settings_path.exists():
                    with open(settings_path) as f:
                        settings = json.load(f)
                    st.success("✅ Settings loaded successfully!")
                    st.json(settings)
                else:
                    st.warning("No settings file found")
            
            # System information
            st.subheader("💻 System Information")
            
            system_info = {
                "Python Version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "Streamlit Version": st.__version__,
                "Working Directory": str(Path.cwd()),
                "Export Directory": str(self.viz_exporter.output_dir),
                "Cache Status": f"{len(self.gene_converter.cache)} items" if hasattr(self.gene_converter, 'cache') else "Not available"
            }
            
            info_df = pd.DataFrame(list(system_info.items()), columns=['Component', 'Value'])
            st.dataframe(info_df, use_container_width=True, hide_index=True)
    
    def show_sidebar(self):
        """Enhanced sidebar with progress tracking and quick stats"""
        with st.sidebar:
            st.markdown("### 🧬 Prairie Genomics Suite")
            st.markdown("*Enhanced Edition*")
            
            # Progress tracking
            st.markdown("### 📋 Analysis Progress")
            
            progress_items = [
                ("📊 Data Import", st.session_state.expression_data is not None),
                ("🔄 Gene Conversion", bool(st.session_state.gene_symbols)),
                ("🧬 Differential Expression", st.session_state.de_results is not None),
                ("📈 Survival Analysis", st.session_state.survival_results is not None),
                ("🔬 Pathway Analysis", st.session_state.pathway_results is not None),
                ("📚 Literature Search", st.session_state.literature_results is not None)
            ]
            
            completed_count = 0
            for item, completed in progress_items:
                if completed:
                    st.markdown(f"✅ {item}")
                    completed_count += 1
                else:
                    st.markdown(f"⏳ {item}")
            
            # Progress bar
            progress_pct = (completed_count / len(progress_items)) * 100
            st.progress(progress_pct / 100)
            st.write(f"Progress: {progress_pct:.0f}% complete")
            
            # Quick statistics
            if st.session_state.expression_data is not None:
                st.markdown("### 📊 Quick Stats")
                
                expr_shape = st.session_state.expression_data.shape
                st.write(f"**Genes**: {expr_shape[0]:,}")
                st.write(f"**Samples**: {expr_shape[1]:,}")
                
                if st.session_state.gene_symbols:
                    st.write(f"**Converted**: {len(st.session_state.gene_symbols):,}")
                
                if st.session_state.de_results is not None:
                    significant = st.session_state.de_results[
                        (st.session_state.de_results['padj'] < 0.05) & 
                        (np.abs(st.session_state.de_results['log2FoldChange']) > 1.0)
                    ]
                    st.write(f"**Significant**: {len(significant):,}")
                
                if st.session_state.pathway_results is not None:
                    total_pathways = 0
                    if 'enrichr' in st.session_state.pathway_results:
                        for db_results in st.session_state.pathway_results['enrichr'].values():
                            total_pathways += db_results.get('significant_terms', 0)
                    st.write(f"**Pathways**: {total_pathways}")
            
            # Quick actions
            st.markdown("### ⚡ Quick Actions")
            
            if st.button("🔄 Reset All Data", key="sidebar_reset_all"):
                for key in ['expression_data', 'clinical_data', 'gene_symbols', 'de_results', 
                           'pathway_results', 'survival_results', 'literature_results']:
                    st.session_state[key] = None if key in ['expression_data', 'clinical_data'] else {} if key == 'gene_symbols' else None
                st.success("✅ All data reset!")
                st.rerun()
            
            if st.button("💾 Export All", key="sidebar_export_all"):
                st.info("Use the Export & Results tab for comprehensive export options")
            
            # Version and credits
            st.markdown("---")
            st.markdown("### 📝 About")
            st.markdown("**Version**: 2.0.0 Enhanced")
            st.markdown("**Author**: Prairie Genomics Team")
            st.markdown("**License**: Open Source")
            
            # Help links
            st.markdown("### 💡 Help & Support")
            st.markdown("📖 [User Guide](#)")
            st.markdown("🐛 [Report Issues](#)")
            st.markdown("💬 [Community Forum](#)")
    
    def run(self):
        """Run the main application"""
        # Show sidebar
        self.show_sidebar()
        
        # Main header and navigation
        tabs = self.show_header()
        
        # Run each section in its respective tab
        self.data_import_section(tabs[0])
        self.gene_conversion_section(tabs[1])
        self.differential_expression_section(tabs[2])
        self.survival_analysis_section(tabs[3])
        self.pathway_analysis_section(tabs[4])
        self.literature_search_section(tabs[5])
        self.advanced_visualizations_section(tabs[6])
        self.export_results_section(tabs[7])
        self.settings_section(tabs[8])
        
        # Footer
        st.markdown("---")
        st.markdown(
            """
            <div style='text-align: center; color: #666; padding: 2rem;'>
                <h3>🧬 Prairie Genomics Suite - Enhanced Edition</h3>
                <p>Publication-ready genomics analysis platform that rivals commercial solutions</p>
                <p>Built with Streamlit • Python • Advanced Analytics</p>
                <p><em>Making genomics analysis accessible to every researcher</em></p>
            </div>
            """, 
            unsafe_allow_html=True
        )

# Main application
if __name__ == "__main__":
    # Initialize and run the enhanced application
    app = PrairieGenomicsEnhanced()
    app.run()